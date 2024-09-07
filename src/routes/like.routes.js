import {Router} from "express"
import { toggleVideoLike } from "../controllers/like.controller.js";
const router = Router()

router.route("/togglevideolike/:videoId").post(toggleVideoLike)
router.route("/togglecommentlike/:commentId").post(toggleVideoLike)
router.route("/getlikedvideos").post(toggleVideoLike)

export default router

