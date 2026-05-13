const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const authMiddleware = require("../middleware/authMiddleware");
const DoctorProfile = require("../models/DoctorProfile");
// GET: Fetch appointments by doctorId and date (used for disabling booked slots)
router.get("/", async (req, res) => {
  const { doctorId, date } = req.query;

  try {
    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: date,
       status: { $ne: "Cancelled" },
    });

    res.json({ success: true, appointments });
  } catch (err) {
    console.error("Error fetching appointments:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// // POST: Book appointment (requires login)
// router.post("/book", authMiddleware(), async (req, res) => {
//   const {
//   doctorId,
//   doctorName,
//   appointmentDate,
//   appointmentTime,
// } = req.body;

// const userId = req.user.id;

// const user = await require("../models/User").findById(userId);
// if (!user) {
//   return res.status(404).json({ success: false, message: "User not found." });
// }

// const patientName = user.fullName;
// const patientEmail = user.email;

// if (
//   !doctorId ||
//   !doctorName ||
//   !appointmentDate ||
//   !appointmentTime
// ) {
//   return res.status(400).json({
//     success: false,
//     message: "All fields are required.",
//   });
// }


//   try {
//     const alreadyBooked = await Appointment.findOne({
//       doctorId,
//       appointmentDate,
//       appointmentTime,
//     });

//     if (alreadyBooked) {
//       return res.status(400).json({
//         success: false,
//         message: "This slot is already booked.",
//       });
//     }

//     const appointment = new Appointment({
//       doctorId,
//       doctorName,
//       patientId,
//       patientName,
//        patientEmail,
//       appointmentDate,
//       appointmentTime,
//     });

//     await appointment.save();

//     res.status(201).json({
//       success: true,
//       message: "Appointment booked successfully.",
//       appointment,
//     });
//   } catch (err) {
//     console.error("Booking error:", err.message);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error.",
//     });
//   }
// });
// POST: Book appointment (requires login)
router.post("/book", authMiddleware(), async (req, res) => {
  const {
    doctorId,
    doctorName,
    appointmentDate,
    appointmentTime,
  } = req.body;

  const userId = req.user.id;

  const user = await require("../models/User").findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const patientName = user.fullName;
  const patientEmail = user.email;

  if (!doctorId || !doctorName || !appointmentDate || !appointmentTime) {
    return res.status(400).json({
      success: false,
      message: "All fields are required.",
    });
  }

  try {
    const alreadyBooked = await Appointment.findOne({
      doctorId,
      appointmentDate,
      appointmentTime,
      status: { $ne: "Cancelled" },
    });

    if (alreadyBooked) {
      return res.status(400).json({
        success: false,
        message: "This slot is already booked.",
      });
    }

    const appointment = new Appointment({
      doctorId,
      doctorName,
      patientId: userId,
      patientName,
      patientEmail,
      appointmentDate,
      appointmentTime,
    });

    await appointment.save();

    const { sendEmail } = require("../utils/emailService");

    // ✅ Send email to patient
    await sendEmail(
      patientEmail,
      "Appointment Confirmation - CureBuddy",
      `Hi ${patientName},\n\nYour appointment with Dr. ${doctorName} is confirmed for ${appointmentDate} at ${appointmentTime}.\n\nRegards,\nCureBuddy Team`
    );

    // ✅ Get doctor email and send email to doctor
    const Doctor = require("../models/DoctorProfile");
    const doctor = await Doctor.findById(doctorId);

    if (doctor && doctor.email) {
      await sendEmail(
        doctor.email,
        "New Appointment Booked - CureBuddy",
        `Dear Dr. ${doctorName},\n\nA new appointment has been booked by ${patientName} for ${appointmentDate} at ${appointmentTime}.\n\nPatient Email: ${patientEmail}\n\nRegards,\nCureBuddy Team`
      );
    } else {
      console.warn(`⚠️ Doctor email not found for doctorId: ${doctorId}`);
    }

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully. Emails sent.",
      appointment,
    });
  } catch (err) {
    console.error("Booking error:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});


// GET: Fetch all appointments for a logged-in patient
router.get("/patient/:patientId", authMiddleware(["patient"]), async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user.id !== patientId) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const appointments = await Appointment.find({ patientId })
      .populate("doctorId", "name professionalInfo.specialization profilePicture")
      .sort({ appointmentDate: -1 });

    res.json({ success: true, appointments });
  } catch (err) {
    console.error("Error fetching patient appointments:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Cancel appointment by patient
router.put("/:id/cancel-by-patient", authMiddleware(["patient"]), async (req, res) => {
  try {
    console.log("➡️ Patient cancel request received for appointment:", req.params.id);
    console.log("🔐 User ID from token:", req.user.id);

    // 1. Fetch the appointment
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      console.log("❌ Appointment not found for id:", req.params.id);
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    console.log("✅ Appointment found:", appointment._id);

    // 2. Check if the appointment belongs to the patient
    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized action." });
    }

    // 3. Check appointment status
    if (!appointment.status) {
      console.log("⚠️ No status found in appointment! Maybe schema is outdated.");
    }

    if (appointment.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Appointment already cancelled." });
    }

    if (appointment.status === "Completed") {
      return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment." });
    }

    // 4. Mark appointment as cancelled
    appointment.status = "Cancelled";
    await appointment.save();

    // 5. Fetch doctor details
    const doctor = await DoctorProfile.findById(appointment.doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    // 6. Send email to doctor
    const { sendEmail } = require("../utils/emailService");

    await sendEmail(
      doctor.email,
      "Appointment Cancelled by Patient - CureBuddy",
      `Dear Dr. ${doctor.name},\n\nThis is to inform you that your appointment with patient ${appointment.patientName} scheduled on ${appointment.appointmentDate} at ${appointment.appointmentTime} has been cancelled by the patient.\n\nRegards,\nCureBuddy Team`
    );

    // 7. Done
    res.json({ success: true, message: "Appointment cancelled and doctor notified." });

  } catch (err) {
    console.error("❌ Cancel-by-patient Error:", err.stack || err.message || err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE: Cancel appointment by ID (only patient who booked it can cancel)
router.delete("/:id", authMiddleware(["patient"]), async (req, res) => {
  const appointmentId = req.params.id;
  const userId = req.user.id;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    // Ensure only the patient who booked it can delete
    if (appointment.patientId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    await Appointment.findByIdAndDelete(appointmentId);

    return res.json({ success: true, message: "Appointment cancelled." });
  } catch (error) {
    console.error("Error cancelling appointment:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});
// ✅ Fetch all appointments for logged-in doctor
router.get("/doctor/me", authMiddleware(["doctor"]), async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    const appointments = await Appointment.find({ doctorId: doctorProfile._id }).sort({ appointmentDate: -1 });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    console.error("Error fetching doctor's appointments:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Doctor dashboard summary: today, upcoming, history
router.get("/doctor/summary", authMiddleware(["doctor"]), async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    const allAppointments = await Appointment.find({ doctorId: doctorProfile._id }).sort({ appointmentDate: 1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

const nonCancelledAppointments = allAppointments.filter(appt => appt.status !== "Cancelled");

// Then use it:
const todayAppointments = nonCancelledAppointments.filter((appt) => {
  const date = new Date(appt.appointmentDate);
  return date >= today && date < tomorrow;
});

const upcomingAppointments = nonCancelledAppointments.filter((appt) => {
  const date = new Date(appt.appointmentDate);
  return date >= tomorrow;
});

const pastAppointments = nonCancelledAppointments.filter((appt) => {
  const date = new Date(appt.appointmentDate);
  return date < today;
});


    res.status(200).json({
      success: true,
      data: {
        today: todayAppointments,
        upcoming: upcomingAppointments,
        history: pastAppointments,
      },
    });
  } catch (err) {
    console.error("Error fetching doctor summary:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.put("/:id/cancel-by-doctor", authMiddleware(["doctor"]), async (req, res) => {
  try {
    console.log("➡️ Doctor cancel request received for appointment:", req.params.id);
    console.log("🔐 User ID from token:", req.user.id);

    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id });
    if (!doctorProfile) {
      console.log("❌ No DoctorProfile found for userId:", req.user.id);
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    console.log("✅ DoctorProfile found:", doctorProfile._id);

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      console.log("❌ Appointment not found for id:", req.params.id);
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    console.log("✅ Appointment found:", appointment._id);
    console.log("🔍 appointment.doctorId:", appointment.doctorId.toString());
    console.log("🔍 doctorProfile._id:", doctorProfile._id.toString());

    if (!appointment.doctorId || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized action." });
    }

    if (!appointment.status) {
      console.log("⚠️ No status found in appointment! Maybe schema is outdated.");
    }

    if (appointment.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Appointment already cancelled." });
    }

    if (appointment.status === "Completed") {
      return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment." });
    }

    appointment.status = "Cancelled";
    await appointment.save();

    const { sendEmail } = require("../utils/emailService");

    await sendEmail(
      appointment.patientEmail,
      "Appointment Cancelled by Doctor - CureBuddy",
      `Dear ${appointment.patientName},\n\nWe regret to inform you that your appointment with Dr. ${appointment.doctorName} on ${appointment.appointmentDate} at ${appointment.appointmentTime} has been cancelled by the doctor.\n\nPlease book a new appointment at your convenience.\n\nRegards,\nCureBuddy Team`
    );

    res.json({ success: true, message: "Appointment cancelled and email sent." });

  } catch (err) {
    console.error("❌ Cancel-by-doctor Error:", err.stack || err.message || err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
