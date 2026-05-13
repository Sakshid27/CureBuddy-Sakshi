import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast"; 

interface Doctor {
  _id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  professionalInfo?: {
    qualification?: string;
    specialization?: string;
    university?: string;
    licenseNo?: string;
    yearsOfExperience?: number;
  };
  consultationInfo?: {
    fee?: number;
    availableDays?: string[];
    availableTimeSlots?: string[];
  };
}

const DoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`${import.meta.env.VITE_API_URL}/api/doctors/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setDoctor(data.data);
            const upcomingDates = buildUpcomingDates(
              data.data?.consultationInfo?.availableDays || []
            );
            setAvailableDates(upcomingDates);
          } else {
            setDoctor(null);
            setAvailableDates([]);
            toast.error("Failed to load doctor profile.");
          }
        })
        .catch(() => {
          setDoctor(null);
          setAvailableDates([]);
          toast.error("Error fetching doctor data.");
        });
    }
  }, [id]);

  useEffect(() => {
    if (!selectedDate || !id) {
      setBookedSlots([]);
      return;
    }
    setLoadingSlots(true);
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/appointments?doctorId=${id}&date=${selectedDate}`)
      .then((res) => {
        if (res.data.success) {
          const slots = res.data.appointments.map(
            (appointment: any) => appointment.appointmentTime
          );
          setBookedSlots(slots);
        } else {
          setBookedSlots([]);
        }
      })
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, id]);

  const buildUpcomingDates = (days: string[]) => {
    const out: string[] = [];
    const today = dayjs();
    for (let i = 0; i < 14; i++) {
      const d = today.add(i, "day");
      if (days.includes(d.format("ddd"))) out.push(d.format("YYYY-MM-DD"));
    }
    return out;
  };

const handleBooking = async () => {

  if (bookingLoading) return;

  if (!selectedDate || !selectedTime) {
    toast.error("Please select a date and time slot.");
    return;
  }

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const storedToken = localStorage.getItem("token");

  if (!storedUser?._id || !storedToken) {
    toast.error("Please login first to book an appointment.");
    return;
  }

  try {

    setBookingLoading(true);

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/appointments/book`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({
          doctorId: id,
          doctorName: doctor?.name || "Unknown",
          doctorEmail: doctor?.email || "",
          patientId: storedUser._id,
          patientName: storedUser.fullName || storedUser.name || "Unknown",
          patientEmail: storedUser.email || "",
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to book appointment");
    }

    // instantly disable booked slot
    setBookedSlots((prev) => [...prev, selectedTime]);

    toast.success("Appointment booked successfully!");

    navigate("/patient/appointments");

  } catch (error: any) {

    console.error("Booking error:", error);

    toast.error(error.message || "Something went wrong while booking.");

  } finally {

    setBookingLoading(false);

  }
};

  if (!doctor) return <p className="p-8 text-center">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 mt-8 rounded shadow">
      <div className="flex items-center gap-6 mb-6">
        <img
          src={
            doctor.profilePicture
              ? `${import.meta.env.VITE_API_URL}/uploads/${doctor.profilePicture}`
              : "/default-doctor.jpg"
          }
          onError={(e) => (e.currentTarget.src = "/default-doctor.jpg")}
          className="w-28 h-28 rounded-full object-cover"
        />
        <div>
          <h2 className="text-2xl font-bold">Dr. {doctor.name}</h2>

          <p className="text-sm text-gray-600">
            {doctor.professionalInfo?.specialization || "Specialization not available"}
          </p>

          <p className="text-sm text-gray-500">
            {doctor.professionalInfo?.qualification || "Qualification not specified"}
            {doctor.professionalInfo?.yearsOfExperience !== undefined &&
              doctor.professionalInfo.yearsOfExperience > 0 && (
                <> &nbsp;|&nbsp;{doctor.professionalInfo.yearsOfExperience} yrs</>
              )}
          </p>

          {doctor.consultationInfo?.fee !== undefined && (
            <p className="text-sm text-gray-700 mt-1">
              Fee: ₹{doctor.consultationInfo.fee}
            </p>
          )}
        </div>
      </div>

      <h3 className="font-semibold mb-1">Select Appointment Day</h3>
      <div className="flex flex-wrap gap-2 mb-6">
        {availableDates.length === 0 && (
          <p className="text-gray-500">No upcoming slots.</p>
        )}
        {availableDates.map((d) => (
          <button
            key={d}
            onClick={() => {
              setSelectedDate(d);
              setSelectedTime("");
            }}
            className={`px-4 py-1 rounded-full border ${
              selectedDate === d
                ? "bg-green-600 text-white"
                : "bg-white text-gray-800"
            }`}
          >
            {dayjs(d).format("ddd, D MMM")}
          </button>
        ))}
      </div>

      <h3 className="font-semibold mb-1">Select Time Slot</h3>
      {loadingSlots && <p className="text-gray-500 mb-2">Loading slots...</p>}
      <div className="flex flex-wrap gap-2 mb-6">
        {doctor.consultationInfo?.availableTimeSlots?.length ? (
          doctor.consultationInfo.availableTimeSlots.map((t) => (
            <button
              key={t}
              disabled={!selectedDate || bookedSlots.includes(t)}
              onClick={() => setSelectedTime(t)}
              className={`px-4 py-1 rounded-full border ${
                selectedTime === t
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-800"
              } disabled:opacity-40`}
              title={bookedSlots.includes(t) ? "Slot already booked" : ""}
            >
              {t} {bookedSlots.includes(t) && "(Booked)"}
            </button>
          ))
        ) : (
          <p className="text-gray-500">No time slots configured.</p>
        )}
      </div>

      <button
        onClick={handleBooking}
        disabled={!selectedDate || !selectedTime || bookingLoading}
        className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {bookingLoading ? "Booking..." : "Book Appointment"}
      </button>
    </div>
  );
};

export default DoctorProfile;
