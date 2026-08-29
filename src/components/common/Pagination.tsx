"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},
}) => {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logic for ellipsis can be added here if needed,
      // but for now let's just show a few around current
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-4 py-6 w-full">
      <Button
        variant={"ghost"}
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all active:scale-90 disabled:opacity-30"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-2">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-xl text-xs font-bold transition-all active:scale-90 shadow-lg ${
              page === currentPage
                ? "bg-[#1A1A1A] text-white shadow-black/10"
                : "bg-white text-gray-400 border border-gray-100 hover:text-black hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <Button
        variant={"ghost"}
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all active:scale-90 disabled:opacity-30"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
};

export const Paginations = Pagination;

//for use this component
//state define
// const [currentPage, setCurrentPage] = useState(1);


//pass parameters like
//    page: currentPage,
    // limit: 10,

// <Pagination
//   currentPage={currentPage}
//   totalPages={10}
//   onPageChange={(page) => setCurrentPage(page)}
// />



