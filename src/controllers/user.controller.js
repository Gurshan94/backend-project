import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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

export {registerUser}