import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHandler( async(req, _, next)=>{  //if res is empty you can use _
    try {
        // take accesstoken from cookie or req header
        const token = req.cookies?.accessToken || req.header
        ("Authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiError(401,"unauthorized request")
        }
        
        //decode the access token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        
        //find the user in db
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401,"Invalid access token")
        }
       
        // so that we can access user in logoutuser
        req.user = user;
        next()

    } catch (error) {
        throw new ApiError(401,error?.message || "invalid access token")
    }
})