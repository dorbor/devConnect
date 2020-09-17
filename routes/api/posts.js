const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");

// model
const Post = require("../../models/Post");
const Profile = require("../../models/Profile");

//validation
const validatePostInput = require("../../validation/posts");
const { profile_url } = require("gravatar");

// @route   GET api/posts
// @desc    get single post by id
// @access  Public

router.get("/:id", (req, res) => {
  Post.findById(req.params.id)
    .then((post) => res.json(post))
    .catch((err) => res.status(404).json({ noPostFound: "Post not found" }));
});

// @route   GET api/posts
// @desc    get all post
// @access  Public

router.get("/", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ noPostsFound: "Post not found" }));
});

// @route   POST api/posts
// @desc    Create Post
// @access  Private
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    if (!isValid) {
      return res.status(400).json(errors);
    }

    const newPost = new Post({
      title: req.body.title,
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id,
    });
    newPost.save().then((post) => res.json(post));
  }
);

// @route   Delete api/posts/:id
// @desc    Delete Post
// @access  Private
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then((profile) => {
      Post.findById(req.params.id)
        .then((post) => {
          //check for post owner
          if (post.user.toString() !== req.user.id) {
            return res
              .status(401)
              .json({ notAuthorized: "User not authorized" });
          }
          post.remove().then(() => res.json({ success: true }));
        })
        .catch((err) => res.json({ noPostFound: "Post not found" }));
    });
  }
);

// @route   POST api/posts/like:id
// @desc    Like Post
// @access  Private
router.post(
  "/like/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then((profile) => {
      Post.findById(req.params.id)
        .then((post) => {
          if (
            post.likes.filter((like) => like.user.toString() == req.user.id)
              .length > 0
          ) {
            return res
              .status(400)
              .json({ alreadyLiked: "You have already liked this post" });
          }
          //add user id to likes arrary
          post.likes.unshift({ user: req.user.id });
          post.save().then((post) => res.json(post));
        })
        .catch((err) => res.json({ noPostFound: "Post not found" }));
    });
  }
);

// @route   POST api/posts/unlike:id
// @desc    unLike Post
// @access  Private
router.post(
  "/unlike/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then((profile) => {
      Post.findById(req.params.id)
        .then((post) => {
          if (
            post.likes.filter((like) => like.user.toString() === req.user.id)
              .length === 0
          ) {
            return res
              .status(400)
              .json({ alreadyLiked: "You haven't liked this post" });
          }
          // get remove index
          const removeIndex = post.likes
            .map((item) => item.user.toString())
            .indexOf(req.user.id);

          //splice out of the array
          post.likes.splice(removeIndex, 1);
          post.save().then((post) => res.json(post));
        })
        .catch((err) => res.json({ noPostFound: "Post not found" }));
    });
  }
);

// @route   POST api/posts/comment/:id
// @desc    add comment to post
// @access  Private
router.post(
  "/comment/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    if (!isValid) {
      return res.status(400).json(errors);
    }

    Post.findById(req.params.id)
      .then((post) => {
        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.body.id,
        };

        post.comment.unshift(newComment);

        //save comment
        post.save().then((post) => res.json(post));
      })
      .catch((err) => res.status(404).json({ postNotFound: "Post not found" }));
  }
);

// @route   Delete api/posts/comment/:id/:com_id
// @desc    Delete comment
// @access  Private
router.delete(
  "comment/:id/com_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then((post) => {
        //check if comment exist
        if (
          post.comment.filter(
            (comment) => comment._id.toString() === req.params.com_id
          ).length === 0
        ) {
          return res.status(401).json({ noComment: "Comment not found" });
        }

        // get remove index
        const removeIndex = post.comments
          .map((item) => item._id.toString())
          .indexOf(req.params.com_id);

        //splice out of the array
        post.comment.splice(removeIndex, 1);

        post.save().then((post) => res.json({ success: true }));
      })
      .catch((err) => res.json({ noPostFound: "Post not found" }));
  }
);

module.exports = router;
