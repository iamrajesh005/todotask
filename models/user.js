const mongoose= require('mongoose');
const schema= mongoose.Schema;
const passportLocalMongoose= require("passport-local-mongoose");



const userSchema= new schema({
    email: {
        type: String,
        required: true
    },
    yourname: {
        type: String,
        required: true
    }
})
userSchema.plugin(passportLocalMongoose.default);
const User= mongoose.model("User", userSchema)
module.exports= User;