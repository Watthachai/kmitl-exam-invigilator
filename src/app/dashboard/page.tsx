export default function Dashboard() {
    return (
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-blue-900 text-white p-4">
          <h1 className="text-2xl font-bold mb-6">KMITL Invigilator</h1>
          <nav>
            <ul>
              <li className="mb-4">
                <a href="/dashboard" className="block py-2 px-4 bg-blue-700 rounded">
                  Dashboard
                </a>
              </li>
              <li className="mb-4">
                <a href="/exam-schedules" className="block py-2 px-4 hover:bg-blue-700 rounded">
                  Exam Schedules
                </a>
              </li>
              <li className="mb-4">
                <a href="/room-status" className="block py-2 px-4 hover:bg-blue-700 rounded">
                  Room Status
                </a>
              </li>
              <li className="mb-4">
                <a href="/reports" className="block py-2 px-4 hover:bg-blue-700 rounded">
                  Reports
                </a>
              </li>
              <li>
                <a href="/profile" className="block py-2 px-4 hover:bg-blue-700 rounded">
                  Profile
                </a>
              </li>
            </ul>
          </nav>
        </aside>
  
        {/* Main Content */}
        <main className="flex-1 bg-gray-100 p-6">
          <h2 className="text-3xl font-bold mb-4">Dashboard Overview</h2>
  
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-bold">Total Rooms</h3>
              <p className="text-2xl">10</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-bold">Total Students</h3>
              <p className="text-2xl">250</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-bold">Unchecked Rooms</h3>
              <p className="text-2xl">2</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-bold">Time Left</h3>
              <p className="text-2xl">1:30:45</p>
            </div>
          </div>
  
          {/* Room Table */}
          <table className="w-full bg-white rounded shadow">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="py-2 px-4">Room ID</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Supervisor</th>
                <th className="py-2 px-4">Start Time</th>
                <th className="py-2 px-4">End Time</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-4">101</td>
                <td className="py-2 px-4">Ongoing</td>
                <td className="py-2 px-4">Mr. A</td>
                <td className="py-2 px-4">9:00 AM</td>
                <td className="py-2 px-4">12:00 PM</td>
                <td className="py-2 px-4">
                  <button className="py-1 px-2 bg-blue-600 text-white rounded">Details</button>
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4">102</td>
                <td className="py-2 px-4">Waiting</td>
                <td className="py-2 px-4">Ms. B</td>
                <td className="py-2 px-4">10:00 AM</td>
                <td className="py-2 px-4">1:00 PM</td>
                <td className="py-2 px-4">
                  <button className="py-1 px-2 bg-blue-600 text-white rounded">Details</button>
                </td>
              </tr>
            </tbody>
          </table>
        </main>
      </div>
    );
  }