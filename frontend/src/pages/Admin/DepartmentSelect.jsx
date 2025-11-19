import React, { useEffect, useState } from "react";
import departmentApi from "../../api/departmentApi";

export default function DepartmentSelect({
  value,
  onChange,
  className = "",
  placeholder = "Chọn khoa",
  disabled = false
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    departmentApi
      .getAllDepartmentsList()
      .then((res) => {
        if (!mounted) return;
        const data = res?.data ?? [];
        const list = Array.isArray(data) ? data : data.content ?? [];
        // Lọc chỉ lấy khoa có trạng thái ACTIVE
        const activeList = list.filter(d => (d.status || d.departmentStatus || d.status_name || '').toUpperCase() === 'ACTIVE');
        setOptions(activeList);
      })
      .catch((err) => {
        console.error("Load departments failed:", err);
        setOptions([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const currentValue =
    value === null || value === undefined || value === "" ? "" : String(value);

  return (
    <div style={{ maxWidth: 400 }}>
      <select
        className={className}
        value={currentValue}
        onChange={onChange}
        disabled={disabled || loading}
        style={{ minHeight: 38, fontSize: 15, padding: '6px 10px', borderRadius: 8 }}
      >
        <option value="">{placeholder}</option>
        {options.map((d) => {
          const id = d.id ?? d.departmentId ?? d.departmentid;
          const name = d.departmentName ?? d.department_name ?? d.name ?? `Khoa ${id}`;
          return (
            <option key={String(id)} value={String(id)}>
              {name}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/*Usage example (đưa vào file form thay vì giữ tại đây):
<DepartmentSelect
  value={form.departmentId}
  onChange={(e) =>
    setForm((prev) => ({
      ...prev,
      departmentId: e.target.value ? Number(e.target.value) : "",
    }))
  }
  className="border rounded px-2 py-1 w-full"
  placeholder="Chọn khoa"
/>*/