'use client';

import { useEffect, useState } from 'react';

const formatGroupNumbers = (groups: SubjectGroup[]): string => {
  return groups.map(group => group.groupNumber).join(', ');
};


interface SubjectGroup {
  groupNumber: string;
}
interface Subject {
  id: string;
  code: string;
  name: string;
  subjectGroups: SubjectGroup[] ;
  department: { name: string };
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data: Subject[]) => setSubjects(data))
      .catch((error) => console.error('Failed to fetch subjects', error));
  }, []);

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4 text-black">Subjects</h1>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2 text-black">ID</th>
            <th className="border p-2 text-black">Code</th>
            <th className="border p-2 text-black">Name</th>
            <th className="border p-2 text-black">Subject Group</th>
            <th className="border p-2 text-black">Department</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id} className="hover:bg-gray-100">
              <td className="border p-2 text-black">{subject.id}</td>
              <td className="border p-2 text-black">{subject.code}</td>
              <td className="border p-2 text-black">{subject.name}</td>
              <td className="border p-2 text-black">
                {
                subject.subjectGroups.length > 0
                ? formatGroupNumbers(subject.subjectGroups)
                : 'N/A'
                }
              </td>
              <td className="border p-2 text-black">{subject.department?.name || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
