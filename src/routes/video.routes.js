import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteVideo, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router()

router.route("/publish").post(
    
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
router.route("/delete-video/:videoId").delete(deleteVideo)
router.route("/toggle-publish-status/:videoId").patch(togglePublishStatus)
export default router