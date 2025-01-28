const mongoose = require('mongoose')
const validator = require('validator');
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        trim: true,
        minlength: [5, 'Username must be at least 5 characters'],
        validate: [validator.isAlphanumeric, 'Username can only contain letters and numbers']
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        validate: [validator.isEmail, 'Email is not valid'],
        lowercase: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    profilePicture: {
        type: String,
        default: 'defaultProfilePicture.jpg',
        validate: [validator.isURL, 'Profile picture must be a valid URL']
    },
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
    resetPasswordToken: {
        type: String,
        minlength: [8, 'Reset password token must be at least 8 characters long'],
        maxlength: [255, 'Reset password token must be less than 255 characters long'],
        // Custom validator
        validate: {
            validator: function (value) {
                // Example: Check if the token contains a specific substring or pattern
                return value?.includes('reset-'); // Ensure token starts with 'reset-'
            },
            message: props => `${props.value} is not a valid reset password token!`
        }
    },
    resetPasswordExpires: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date,
    emailVerificationToken: {
        type: String,
        index: true,
        select: false
      },
      emailVerificationExpires: Date,
      passwordChangedAt: Date,
      loginAttempts: {
        type: Number,
        default: 0,
        select: false
      },
      lockUntil: {
        type: Date,
        select: false
      },
      refreshTokens: [{
        token: String,
        issuedAt: Date,
        deviceInfo: String,
        ipAddress: String,
        expiresAt: Date
      }],
      lastPasswordChange: Date
})

userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Compile the schema into a model
const User = mongoose.model('User', userSchema);

module.exports = User;