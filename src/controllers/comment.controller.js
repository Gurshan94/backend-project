import mongoose, { Schema } from "mongoose";
import {Comment} from "../models/comment.models.js"
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(500,"video not found")
    }

    const commentsAggregate = await Video.aggregate([
        {
            $match:{
                video:new mongoose.Types.ObjectId(video?._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));

})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;
    // TODO: add a comment to a video
    if(!videoId){
        throw new ApiError(400,"videoId is required")
    }
    if(!content){
        throw new ApiError(400,"content is required")
    }
    
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400,"video does not exist")
    }

    const newComment = await Comment.create({
        comment:content,
        video:videoId,
        owner:req.user?._id
    })

    if(!newComment){
        throw new ApiError(500,"something went wrong while adding comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
        200,
        newComment,
        "comment added succesfully"
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;

    if(!content){
        throw new ApiError(400,"comment is required")
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only comment owner can edit their comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set:{
                content:content
            }
        },{new:true}
    )
    if(!updatedComment){
        throw new ApiError(500,"something went wrong while updating the comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
        200,
        updatedComment,
        "comment edited succesfully"
        )
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    const comment =await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(500,"comment not found")
    }

    await Comment.findByIdAndDelete(comment?._id)

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user
    });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {commentId},
            "comment deleted succesfully"
        )
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }