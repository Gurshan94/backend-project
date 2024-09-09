import { Router } from "express";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/toggle-subscription/:channelId").post(verifyJWT,toggleSubscription)
router.route("/get-subscribers/:channelId").get(verifyJWT,getUserChannelSubscribers)
router.route("/get-channels/:subscriberId").get(verifyJWT,getSubscribedChannels)

export default router