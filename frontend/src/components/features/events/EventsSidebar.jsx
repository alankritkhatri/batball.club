import React from "react";
import "./EventsSidebar.css";

const EventsSidebar = () => {
  const upcomingEvents = [
    {
      id: 1,
      title: "IPL 2024 Opening Ceremony",
      date: "2024-03-22",
      time: "19:00",
      venue: "M.A. Chidambaram Stadium, Chennai",
      type: "ceremony",
    },
    {
      id: 2,
      title: "CSK vs RCB",
      date: "2024-03-22",
      time: "20:00",
      venue: "M.A. Chidambaram Stadium, Chennai",
      type: "match",
    },
    {
      id: 3,
      title: "GT vs MI",
      date: "2024-03-23",
      time: "19:30",
      venue: "Narendra Modi Stadium, Ahmedabad",
      type: "match",
    },
  ];

  return (
    <div className="events-sidebar">
      <h2>Upcoming Events</h2>
      <div className="events-list">
        {upcomingEvents.map((event) => (
          <div key={event.id} className="event-card">
            <div className="event-header">
              <span className="event-type">{event.type}</span>
              <span className="event-date">
                {new Date(event.date).toLocaleDateString()}
              </span>
            </div>
            <h3 className="event-title">{event.title}</h3>
            <div className="event-details">
              <div className="event-time">{event.time}</div>
              <div className="event-venue">{event.venue}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsSidebar;
