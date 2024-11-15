"use client";

import React, { useState } from "react";
import "@/app/style.css";

const LoyKrathongPage = () => {
  const [krathongMessage, setKrathongMessage] = useState("");
  const [krathongs, setKrathongs] = useState<{ message: string; left: number }[]>([]);

  const handleFloatKrathong = () => {
    if (krathongMessage.trim() !== "หมูเด้งๆ") {
      const randomLeft = Math.floor(Math.random() * 100); // Random position between 0% and 100%
      setKrathongs([...krathongs, { message: "หมูเด้งๆ", left: randomLeft }]);
      setKrathongMessage("");
    }
  };

  return (
    <div className="loykrathong-page">
      <h1 className="title">🌕 มาลอยกันจ้าาา 🌕</h1>
      <p className="description">ขออะไรก็ได้!</p>

      {/* Input and Button */}
      <div className="input-section">
        <input
          type="text"
          placeholder="ข้อความบนกระทง"
          value='หมูเด้งๆ'
          onChange={(e) => setKrathongMessage(e.target.value)}
        />
        <button onClick={handleFloatKrathong}>ลอยไปเลย</button>
      </div>

      {/* Animated Krathong Display */}
      <div className="water">
        {krathongs.map((krathong, index) => (
          <div
            key={index}
            className="krathong"
            style={{ left: `${krathong.left}%` }} // Position each Krathong randomly
          >
            <div className="message">"{krathong.message}"</div>
            <div className="krathong-image" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoyKrathongPage;
