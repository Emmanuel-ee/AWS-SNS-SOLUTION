"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.donate = void 0;
const User_1 = __importDefault(require("../models/User"));
const aws_sdk_1 = __importDefault(require("aws-sdk")); // Import AWS SDK
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const users = [];
const ses = new aws_sdk_1.default.SES({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const donate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract data from the request body
        const { email, donations, name } = req.body;
        if (!email || !donations || !name) {
            // If any required field is missing, send a bad request response
            return res.status(400).json({ error: "Missing required fields." });
        }
        // Verify the sender's email address if not verified already
        const senderEmail = process.env.SENDER_EMAIL;
        try {
            const verifiedAddressesResponse = yield ses
                .listVerifiedEmailAddresses()
                .promise();
            const verifiedAddresses = verifiedAddressesResponse.VerifiedEmailAddresses || [];
            const userEmail = email;
            if (!verifiedAddresses.includes(senderEmail)) {
                yield ses.verifyEmailAddress({ EmailAddress: senderEmail }).promise();
                console.log(`Sender email ${senderEmail} has been verified.`);
            }
            if (!verifiedAddresses.includes(userEmail)) {
                yield ses.verifyEmailAddress({ EmailAddress: userEmail }).promise();
                console.log(`user email ${userEmail} has been verified.`);
            }
        }
        catch (error) {
            console.error("Error verifying email:", error);
        }
        let user = users.find((u) => u.email === email);
        if (!user) {
            user = new User_1.default(email, name);
            users.push(user);
            user.donations.push(donations);
        }
        else {
            user.donations.push(donations);
        }
        // if (user.donations.length >= 2) {
        //   console.log(`User ${user.email} made 2 or more donations.`);
        //   console.log(user);
        // }
        if (user.donations.length >= 2) {
            // Send thank-you email
            const params = {
                Destination: {
                    ToAddresses: [user.email],
                },
                Message: {
                    Body: {
                        Text: { Data: "Thank you for your generous donations!" },
                    },
                    Subject: { Data: "Thank You for Your Donations" },
                },
                Source: senderEmail,
            };
            try {
                yield ses.sendEmail(params).promise();
                console.log(`Thank-you email sent to ${user.email}`);
            }
            catch (error) {
                console.error("Error sending thank-you email:", error);
            }
            console.log(`User ${user.email} made 2 or more donations.`);
        }
        // Send a success response
        res.status(201).json({ message: "Donation received." });
        console.log(users);
    }
    catch (error) {
        // Handle any errors that occurred during the donation process
        console.error("Error processing donation:", error);
        res
            .status(500)
            .json({ error: "An error occurred while processing the donation." });
    }
});
exports.donate = donate;
