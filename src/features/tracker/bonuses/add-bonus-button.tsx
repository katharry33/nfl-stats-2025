"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react"; 
// Note: If you don't have a Dialog component yet, 
// we'll use a simple state for now to clear the 'Dialog' errors.

export const AddBonusButton = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)}
        variant="default" 
        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
      >
        <PlusCircle size={18} />
        <span>Add Bonus</span>
      </Button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Bonus</h2>
            <p className="text-slate-500 mb-6">Form goes here...</p>
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </div>
        </div>
      )}
    </>
  );
};