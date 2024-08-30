import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken" 

const generateAccessAndRefreshTokens = async(userId)=>{
    try {
       const user = await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken
       await user.save({ validateBeforeSave: false })

       return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500, "something wnet wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res) => {
    // get user details from frontend
    // validation -not empty
    // check user already exist:check username,email
    // check for images , avatar
    // upload to cludinary , avatar
    // create user object - create entry in db
    // remove password , refresh token from response
    // check for user creation
    // return res


    const {fullName,email,username,password}=req.body
    // console.log("email: ",email)
    
    //validation
    if(
        [fullName,email,username,password].some((field) => 
        field?.trim() === "")
    ){
       throw new ApiError(400, "All fields are required")
    }
    
    //check if user exist
    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username alreeady exists")
    }
    
    //check for image and avatar
    const avatarLocalPath=req.files?.avatar[0]?.path
    // const coverImageLocalPath=req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    //upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    //create user & entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", //we didn`t check it earlier
        email,
        password,
        username: username.toLowerCase()
    })
 
    const createdUser = await User.findById(user._id).select(   // check if the user was created and remove password and refresh token
        "-password -refreshToken"
    ) 
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registring")
    }

    //return response
    return res.status(201).json(
       new ApiResponse(200,createdUser,"User registered succesfully")
    )

})

const loginUser = asyncHandler(async (req,res) =>{
   // req body -> data
   // username or email 
   // find the user in db
   // check password
   // generate access and refresh token 
   // send cookie

   const {username,email,password} = req.body
    

   //check username or email
   if(!username && !email){
     throw new ApiError(400, "username or email is required")
   }

   //find user in db
   const user = await User.findOne({
     $or: [{username},{email}]
   })

   if(!user){
    throw new ApiError(404, "user does not exist")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)
   
   //check password
   if(!isPasswordValid){
    throw new ApiError(401, "Invalid user credentials")
   }
   
   //generate access and refresh tokens
   const {accessToken,refreshToken} = await 
   generateAccessAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
   
   //cookies (due to options the cookie will not be modifiable on website i.e it could be modified only on server)
   const options={
    httpOnly:true,
    secure: true
   }

   return res.status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse(
        200,
        {
            user:loggedInUser, accessToken, refreshToken
        },
        "user logged in succesfully"
    )
   )
   

})

const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true  // we will get(return) updates values ie undefined refresh token
        }
    )

    const options={
        httpOnly:true,
        secure: true
       }
       return res.status(200)
       .clearCookie("accessToken", options)
       .clearCookie("refreshToken", options)
       .json(new ApiResponse(200,{},"user logged out"))

})
 
const refreshAccessToken = asyncHandler( async (req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request") 
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"refresh token is expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message||"invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
     const {oldPassword,newPassword}= req.body

     const user = await User.findById(req.user?._id)
     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

     if(!isPasswordCorrect){
         throw new ApiError(400, "Invalid old password")
     }

     user.password = newPassword 
     await user.save({validateBeforeSave: false})

     return res
     .status(200)
     .json(new ApiResponse(200,{},"password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "user fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body
    if(!fullName || !email){
        throw new ApiError(400, "all fields are required")
    }

    const user =await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                fullName: fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"avatar updated successfully")
    )

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage file is missing")
    }

    const coverImage= await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"error while uploading on CoverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"cover image updated successfully")
    )

})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}