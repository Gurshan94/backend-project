import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllVideos, getVideoById, publishAVideo, updateVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router()

router.route("/publish").post(
    verifyJWT,
    upload.fields([
    {
        name:"videoFile",
        maxCount:1
    },
    {
        name:"thumbnail",
        maxCount:1
    }
]),publishAVideo)

router.route("/getvideos").get(getAllVideos)
router.route("/get-video/:videoId").get(getVideoById)
router.route("/update-video/:videoId").post(upload.single("thumbnail"),updateVideo)


export default router