import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
      type: Schema.Types.ObjectId, // subscriber of channel
      ref: "User"
    },
    channel: {
      type: Schema.Types.ObjectId,  //owner  of channel
      ref: "User"
    }
},{timestamps: true})

export const Subscription = mongoose.model("subscription",subscriptionSchema)