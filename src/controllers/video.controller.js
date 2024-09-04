import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { limit = 10, query, sortBy, sortType, userId } = req.query
    
    const pipeline=[]

    if(query){
        pipeline.push({
            $search:{
                index:"search-videos",
                text:{
                    query: query,
                    path: ["title","description"]
                }
            }
        })
    }
    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400,"not a valid user")
        }
       pipeline.push({
        $match:{
            owner: new mongoose.Types.ObjectId(userId)
        }
        })
    }
    pipeline.push({
        $match:{
            isPublished:false
            }
        })

    if(sortBy&&sortType){
        pipeline.push({
            $sort:{
                [sortBy]:sortType==='asc'?1:-1
            }
        })
    }else{
        pipeline.push({
            $sort:{createdAt:-1}
        })
    }

    pipeline.push({
      $lookup:{
        from:"users",
        localField:"owner",
        foreignField:"_id",
        as:"ownerDetails",
        pipeline:[
            {
                $project:{
                    username: 1,
                    avatar :1
                }
            }
        ]
      }
    },
    {
        $unwind:"$ownerDetails"
    }
)
pipeline.push({
    $limit:limit
})

const videoAggregate = await Video.aggregate(pipeline)
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videoAggregate,
            "videos fetched successfully"
        )
    )
})
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    
    if([title,description].some((field)=>
       field?.trim()==="")
    ){
     throw new ApiError(400,"all fields are required")
    }

    const videoFileLocalPath=req.files?.videoFile[0]?.path
    const thumbnailLocalPath=req.files?.thumbnail[0]?.path

    if(!videoFileLocalPath){
        throw new ApiError(400,"videoFile is required")
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400,"thumbnail is required")
    }

    const videoFile=await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile){
        throw new ApiError(400,"videoFile failed to upload")
    }
    if(!thumbnail){
        throw new ApiError(400,"thumbnail failed to upload")
    }

    const video = await Video.create({
        title,
        description,
        duration:videoFile.duration,
        videoFile:videoFile.url,
        thumbnail:thumbnail.url,
        owner: req.user?._id,
        isPublished: false
    })

    const uploadedVideo = await Video.findById(video._id)

    if(!uploadedVideo){
        throw new ApiError(500,"video upload failed")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"enter a valid video id")
    }

    const video = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
               from: "users",
               localField: "owner",
               foreignField: "_id",
               as: "owner",
               pipeline:[
                  {
                    $lookup:{
                        from: "subscriptions",
                        localField: "_id",
                        foreignField: "channel",
                        as: "subscribers"
                    }
                  },
                  {
                    $addFields:{
                        subscribercount:{
                            $size:"$subscribers"
                        },
                        isSubscribed:{
                            $cond:{
                                if:{
                                    $in:[req.user?._id,"$subscribers.subscriber"]
                                },
                                then: true,
                                else: false
                            }
                        }
                    }
                  },
                  {
                    $project:{
                        username:1,
                        avatar: 1,
                        subscribercount: 1,
                        isSubscribed: 1
                    }
                  }
               ]
            }
        },
        {
            $addFields:{
              likesCount:{
                $size:"$likes"
              },
              owner:{
                $first:"$owner"
              },
              isLiked:{
                $cond:{
                    if:{
                        $in:[req.user?._id,"$likes.likedBy"]
                    },
                    then: true,
                    else: false
                }
              }
            }
        },
        {
            $project:{
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
         }
    ])
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "video fetched successfully"
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}