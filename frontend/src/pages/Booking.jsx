import React, { useState } from "react";

const doctor = {
  name: "Dr. Michael Brown",
  specialty: "Psychologist",
  rating: 5.0,
  address: "5th Street - 1011 W 5th St, Suite 120, Austin, TX 78703",
  avatarUrl: "/doctor-avatar.png",
};

const bookingInfo = {
  service: "Cardiology (30 Mins)",
  detail: "Echocardiograms",
  appointmentType: "Clinic (Wellness Path)",
};

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const timeSlots = {
  morning: ["09:45", "10:45", "11:45"],
  afternoon: ["13:45", "14:45", "15:45"],
  evening: ["17:45", "18:45", "19:45"],
};

export default function Booking() {
  const [selectedDay, setSelectedDay] = useState(10);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");

  // Thêm useNavigate để chuyển trang
  const navigate = window.reactRouterNavigate || null;

  const handleNext = () => {
    if (navigate) {
      navigate('/payment');
    } else {
      window.location.href = '/payment';
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 mt-6">
      {/* Featured Doctors Title */}
      <div className="w-full flex flex-col items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center">Bác sĩ tiêu biểu</h2>
        <p className="text-gray-600 text-sm mt-1 text-center">Chọn từ 6 bác sĩ được đánh giá cao nhất</p>
      </div>
      {/* Doctor Info */}
      <div className="flex items-center gap-6 mb-6">
        <img
          src={doctor.avatarUrl}
          alt="Doctor"
          className="w-20 h-20 rounded-full object-cover"
        />
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {doctor.name}
            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold">
              {doctor.rating} ★
            </span>
          </h2>
          <div className="text-blue-700 font-medium">{doctor.specialty}</div>
          <div className="text-gray-600 text-sm">{doctor.address}</div>
        </div>
      </div>

      {/* Booking Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 flex flex-wrap gap-8">
        <div>
          <div className="text-xs text-gray-500">Service</div>
          <div className="font-semibold">{bookingInfo.service}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Service</div>
          <div className="font-semibold">{bookingInfo.detail}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Date & Time</div>
          <div className="font-semibold">
            {selectedTime
              ? `${selectedTime}, ${selectedDay} Oct`
              : `Chưa chọn`}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Appointment type</div>
          <div className="font-semibold">{bookingInfo.appointmentType}</div>
        </div>
      </div>

      {/* Calendar & Time Slots */}
      <div className="flex gap-8 mb-6">
        {/* Calendar */}
        <div>
          <div className="font-semibold mb-2">October 2025</div>
          <div className="grid grid-cols-7 gap-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="text-xs text-gray-500 text-center">
                {d}
              </div>
            ))}
            {calendarDays.map((day) => (
              <button
                key={day}
                className={`w-8 h-8 rounded ${
                  selectedDay === day
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        {/* Time Slots */}
        <div className="flex-1">
          {Object.entries(timeSlots).map(([period, slots]) => (
            <div key={period} className="mb-4">
              <div className="font-semibold mb-2 capitalize">
                {period}
              </div>
              <div className="flex gap-2 flex-wrap">
                {slots.map((time) => (
                  <button
                    key={time}
                    className={`px-4 py-2 rounded border ${
                      selectedTime === time && selectedPeriod === period
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => {
                      setSelectedTime(time);
                      setSelectedPeriod(period);
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold">
          &lt; Back
        </button>
        <button
          className={`px-6 py-2 rounded bg-blue-500 text-white font-semibold ${
            !selectedTime ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!selectedTime}
          onClick={handleNext}
        >
          Add Basic Information &rarr;
        </button>
      </div>
    </div>
  );
}
