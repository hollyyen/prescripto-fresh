# Prescripto – how to run (VS Code)

Open this folder in VS Code, then use 3 terminals.

## One-time setup
```
cd backend  && npm install
cd ../frontend && npm install
cd ../admin && npm install
```
`backend/.env`, `frontend/.env` and `admin/.env` are already filled in.

## Fill the database with demo data (once)
```
cd backend
npm run seed
```
Creates 15 doctors (with photos), 5 patients and 18 appointments (upcoming, paid, completed, cancelled).
Running it again refreshes the demo data; it does not touch accounts you create yourself.

## Start everything
- Terminal 1: `cd backend  && npm run server`   -> must print "Database Connected"
- Terminal 2: `cd frontend && npm run dev`      -> http://localhost:5173
- Terminal 3: `cd admin    && npm run dev`      -> http://localhost:5174

## Logins
| Where | Email | Password |
|---|---|---|
| Patient site | demo@prescripto.com | patient123 |
| Admin panel (Admin) | peepo@example.com | peepo12345 |
| Admin panel (Doctor) | richard.james@prescripto.com | doctor123 |

You can also create your own account on the patient site (password 8+ characters).
All seeded doctors use password `doctor123`; their emails are `firstname.lastname@prescripto.com`.

## Fixes included in this version
- Create Account now properly checks for existing emails and shows clear messages
- Better success/error toasts on register & login
- Appointment booking is more robust (handles missing slots_booked, consistent time format)

## Notes
- Online payment buttons need real Razorpay/Stripe keys; the .env has dummy ones, so payments will not work.
- Do not upload the .env files to GitHub.

