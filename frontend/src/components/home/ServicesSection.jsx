import React from 'react';
import { Activity, Calendar, Stethoscope, TestTube, Brain, Pill, Scissors, FileText } from "lucide-react";

const services = [
  {
    icon: Stethoscope,
    title: "Khám Chuyên khoa",
    description: "Đặt lịch với bác sĩ chuyên khoa",
    color: "bg-blue-500",
  },
  {
    icon: Calendar,
    title: "Khám định kỳ",
    description: "Kiểm tra sức khỏe định kỳ hàng năm",
    color: "bg-teal-500",
  },
  {
    icon: Activity,
    title: "Khám tổng quát",
    description: "Gói khám sức khỏe toàn diện",
    color: "bg-green-500",
  },
  {
    icon: TestTube,
    title: "Xét nghiệm y học",
    description: "Đặt lịch xét nghiệm nhanh chóng",
    color: "bg-purple-500",
  },
  {
    icon: Brain,
    title: "Sức khỏe tinh thần",
    description: "Tư vấn tâm lý và sức khỏe tinh thần",
    color: "bg-pink-500",
  },
  {
    icon: Pill,
    title: "Khám nha khoa",
    description: "Chăm sóc răng miệng chuyên nghiệp",
    color: "bg-cyan-500",
  },
  {
    icon: Scissors,
    title: "Gói Phẫu thuật",
    description: "Tư vấn và đặt lịch phẫu thuật",
    color: "bg-orange-500",
  },
  {
    icon: FileText,
    title: "Hồ sơ bệnh án",
    description: "Quản lý hồ sơ bệnh án điện tử",
    color: "bg-red-500",
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Dịch vụ toàn diện</h2>
          <p className="text-gray-600">Đa dạng dịch vụ y tế chất lượng cao</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl border bg-white p-6 transition-all hover:shadow-lg hover:border-blue-500/50 cursor-pointer"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`${service.color} p-3 rounded-lg text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1 text-gray-900">{service.title}</h3>
                    <p className="text-xs text-gray-600">{service.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
