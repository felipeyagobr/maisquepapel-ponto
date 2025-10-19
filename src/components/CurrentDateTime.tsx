"use client";

import React, { useState, useEffect } from "react";

const CurrentDateTime = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = currentDateTime.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="text-center space-y-2">
      <p className="text-xl font-medium text-muted-foreground">{formattedDate}</p>
      <p className="text-5xl font-extrabold text-primary dark:text-primary-foreground animate-pulse-slow">
        {formattedTime}
      </p>
    </div>
  );
};

export default CurrentDateTime;