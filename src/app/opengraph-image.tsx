import { ImageResponse } from "next/og";

export const alt =
  "Scheduler Booker online appointment scheduling and booking software";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f8fafc",
          color: "#0f172a",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 84px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 670 }}>
          <div
            style={{
              color: "#2563eb",
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.08em",
              marginBottom: 30,
              textTransform: "uppercase",
            }}
          >
            Scheduler Booker
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 750,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            A simpler way to schedule client appointments.
          </div>
          <div
            style={{
              color: "#475569",
              display: "flex",
              fontSize: 28,
              lineHeight: 1.4,
              marginTop: 30,
            }}
          >
            Set your availability. Share your link. Manage upcoming bookings.
          </div>
        </div>

        <div
          style={{
            background: "white",
            border: "2px solid #cbd5e1",
            borderRadius: 28,
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
            display: "flex",
            flexDirection: "column",
            height: 390,
            padding: 34,
            width: 320,
          }}
        >
          <div
            style={{
              borderBottom: "2px solid #e2e8f0",
              display: "flex",
              fontSize: 25,
              fontWeight: 700,
              paddingBottom: 22,
            }}
          >
            Available times
          </div>
          {["9:00 AM", "10:30 AM", "1:00 PM"].map((time, index) => (
            <div
              key={time}
              style={{
                background: index === 1 ? "#2563eb" : "#f8fafc",
                border: index === 1 ? "2px solid #2563eb" : "2px solid #e2e8f0",
                borderRadius: 14,
                color: index === 1 ? "white" : "#0f172a",
                display: "flex",
                fontSize: 22,
                fontWeight: 650,
                justifyContent: "center",
                marginTop: 20,
                padding: "16px 20px",
              }}
            >
              {time}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
