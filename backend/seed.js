// Fills the database with demo doctors, patients and appointments.
// Run:  npm run seed      (safe to run again; it refreshes the demo data)
import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import doctorModel from './models/doctorModel.js'
import userModel from './models/userModel.js'
import appointmentModel from './models/appointmentModel.js'
import { doctorsSeed } from './seedData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCTOR_PASSWORD = 'doctor123'
const PATIENT_PASSWORD = 'patient123'

// ---- helpers ---------------------------------------------------------------
// Same format the frontend uses when booking: D_M_YYYY (no zero padding) and "10:00 AM"
const slotDateOf = (d) => `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
const TIMES = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '07:00 PM']
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d }

const fallbackAvatar = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name.replace('Dr. ', ''))}&size=256&background=5f6FFF&color=fff`

const uploadImage = async (doc) => {
    const file = path.join(__dirname, '..', 'frontend', 'src', 'assets', `${doc.key}.png`)
    if (!process.env.CLOUDINARY_NAME || !fs.existsSync(file)) return fallbackAvatar(doc.name)
    try {
        const res = await cloudinary.uploader.upload(file, {
            folder: 'prescripto-demo', public_id: doc.key, overwrite: true, resource_type: 'image'
        })
        return res.secure_url
    } catch (e) {
        console.log(`  (image upload failed for ${doc.name}: ${e.message}; using a generated avatar)`)
        return fallbackAvatar(doc.name)
    }
}

// ---- demo patients ---------------------------------------------------------
const patientsSeed = [
    { name: 'Demo Patient', email: 'demo@prescripto.com', phone: '9876500001', gender: 'Male', dob: '1998-04-12', address: { line1: '12 MG Road', line2: 'Varanasi, UP' } },
    { name: 'Priya Verma', email: 'priya.verma@example.com', phone: '9876500002', gender: 'Female', dob: '1993-09-03', address: { line1: '45 Lanka Road', line2: 'Varanasi, UP' } },
    { name: 'Rohan Mehta', email: 'rohan.mehta@example.com', phone: '9876500003', gender: 'Male', dob: '1989-01-27', address: { line1: '8 Civil Lines', line2: 'Lucknow, UP' } },
    { name: 'Sneha Iyer', email: 'sneha.iyer@example.com', phone: '9876500004', gender: 'Female', dob: '2001-06-19', address: { line1: '3 Park Street', line2: 'Kolkata, WB' } },
    { name: 'Aarav Sharma', email: 'aarav.sharma@example.com', phone: '9876500005', gender: 'Male', dob: '1985-11-30', address: { line1: '22 Sector 15', line2: 'Noida, UP' } },
]

// [patientIndex, doctorIndex, dayOffset, timeIndex, status]  status: pending | paid | done | cancelled
const appointmentsPlan = [
    [0, 0, 1, 1, 'pending'], [0, 2, 2, 4, 'paid'], [0, 4, 3, 8, 'pending'], [0, 3, -4, 2, 'done'], [0, 1, -9, 6, 'cancelled'],
    [1, 0, 1, 3, 'paid'], [1, 6, 2, 0, 'pending'], [1, 10, -2, 5, 'done'],
    [2, 4, 1, 9, 'pending'], [2, 5, 4, 2, 'paid'], [2, 0, -6, 7, 'done'],
    [3, 2, 2, 11, 'pending'], [3, 8, 3, 3, 'pending'], [3, 1, -3, 10, 'cancelled'],
    [4, 7, 1, 12, 'paid'], [4, 3, 5, 1, 'pending'], [4, 12, -1, 4, 'done'], [4, 0, 0, 13, 'pending'],
]

const run = async () => {
    const uri = (process.env.MONGODB_URI || '').trim().replace(/\/+$/, '')
    if (!uri) { console.error('MONGODB_URI missing in backend/.env'); process.exit(1) }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET_KEY,
    })

    await mongoose.connect(uri, { dbName: 'prescripto' })
    console.log('Database Connected')

    // 1. Doctors
    console.log('Creating doctors (uploading photos, this takes about a minute)...')
    const doctorHash = await bcrypt.hash(DOCTOR_PASSWORD, 10)
    const doctors = []
    for (const d of doctorsSeed) {
        const image = await uploadImage(d)
        const doc = await doctorModel.findOneAndUpdate(
            { email: d.email },
            {
                name: d.name, email: d.email, password: doctorHash, image, speciality: d.speciality,
                degree: d.degree, experience: d.experience, about: d.about, fees: d.fees,
                address: d.address, available: true, slots_booked: {}, date: Date.now(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        doctors.push(doc)
        console.log(`  + ${d.name} (${d.speciality})`)
    }

    // 2. Patients
    const patientHash = await bcrypt.hash(PATIENT_PASSWORD, 10)
    const patients = []
    for (const p of patientsSeed) {
        const u = await userModel.findOneAndUpdate(
            { email: p.email }, { ...p, password: patientHash }, { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        patients.push(u)
    }
    console.log(`Created ${patients.length} patients`)

    // 3. Appointments (refresh demo ones only)
    await appointmentModel.deleteMany({ userId: { $in: patients.map(p => p._id.toString()) } })
    const slotsBooked = {}   // docId -> { slotDate: [times] }
    let count = 0
    for (const [pi, di, dayOffset, ti, status] of appointmentsPlan) {
        const patient = patients[pi], doctor = doctors[di]
        const when = daysFromNow(dayOffset)
        const slotDate = slotDateOf(when), slotTime = TIMES[ti]
        const cancelled = status === 'cancelled'

        // keep two appointments from taking the same doctor slot
        const key = doctor._id.toString()
        slotsBooked[key] = slotsBooked[key] || {}
        const taken = slotsBooked[key][slotDate] || []
        if (taken.includes(slotTime)) continue

        const userData = patient.toObject(); delete userData.password
        const docData = doctor.toObject(); delete docData.password; delete docData.slots_booked

        await appointmentModel.create({
            userId: patient._id.toString(), docId: key, slotDate, slotTime, userData, docData,
            amount: doctor.fees, date: when.getTime() - 86400000,
            cancelled, payment: status === 'paid' || status === 'done', isCompleted: status === 'done',
        })
        count++
        if (!cancelled) slotsBooked[key][slotDate] = [...taken, slotTime]
    }
    for (const [docId, slots] of Object.entries(slotsBooked)) {
        await doctorModel.findByIdAndUpdate(docId, { slots_booked: slots })
    }
    console.log(`Created ${count} appointments`)

    console.log(`
Done! Demo logins
  Patient site  (http://localhost:5173)  demo@prescripto.com / ${PATIENT_PASSWORD}
  Admin panel   (http://localhost:5174)  ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}
  Doctor panel  (http://localhost:5174, choose "Doctor")  richard.james@prescripto.com / ${DOCTOR_PASSWORD}
`)
    await mongoose.disconnect()
}

run().catch(async (e) => { console.error('Seed failed:', e.message); await mongoose.disconnect(); process.exit(1) })
