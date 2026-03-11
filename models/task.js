const mongoose= require('mongoose');
const schema= mongoose.Schema;
const User= require("./user.js");



const taskSchema= new schema({
    taskname: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    compDate: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now()
    },
    priority: {
        type: String,
        enum: ["high-priority", "medium-priority", "low-priority"]
    },
    user:[{
        type: schema.Types.ObjectId,
        ref: "User"
    }],
    isDone:{
        type: Boolean,
        default: false
    }

})

const Task= mongoose.model("Task", taskSchema)

module.exports= Task;