import React from 'react';

const Credits = () => {
  return (
    <div className="bg-gray-100 py-4 border-t border-gray-200 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="text-sm text-gray-600">
            Made with ❤️ for Electric Vehicle owners in India
          </p>
          <p className="text-sm text-gray-500">
            Created by 
            <span className="font-medium text-gray-700"> Adhiraj Kalkundrikar</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © {new Date().getFullYear()} EV Charge Finder - All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Credits;