import mongoose from "mongoose";

const connectDB = async () => {

    const uri = (process.env.MONGODB_URI || '').trim().replace(/\/+$/, '')

    if (!uri) {
        console.error('MONGODB_URI is missing. Add it to backend/.env and restart.')
        process.exit(1)
    }

    mongoose.connection.on('connected', () => console.log("Database Connected"))

    try {
        // dbName is passed as an option so a trailing "/" or "?options" in the URI can never break the connection
        await mongoose.connect(uri, { dbName: 'prescripto' })
    } catch (error) {
        console.error('\nCould not connect to MongoDB:', error.message)
        if (/auth/i.test(error.message)) {
            console.error('-> Wrong database username/password in MONGODB_URI (use the Database Access user, not your Atlas login).')
        } else {
            console.error('-> Check Atlas > Network Access allows your IP (0.0.0.0/0) and the cluster address is correct.')
        }
        process.exit(1)
    }

}

export default connectDB;
