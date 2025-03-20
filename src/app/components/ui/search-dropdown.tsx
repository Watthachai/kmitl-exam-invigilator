import { Fragment, useState } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'

// Define types for the component props and invigilator object
interface Invigilator {
  id: string;
  name?: string;
  displayName?: string;
  type?: string;
  isProfessor?: boolean;
  assignedQuota?: number;
  quota?: number;
  department?: {
    name?: string;
  };
}

interface SearchableInvigilatorSelectProps {
  invigilators: Invigilator[];
  selectedInvigilator: Invigilator | null;
  onChange: (invigilator: Invigilator | null) => void;
  placeholder?: string;
}

// สร้าง Component SearchableSelect สำหรับใช้ในโปรเจค
export default function SearchableInvigilatorSelect({ 
  invigilators, 
  selectedInvigilator, 
  onChange, 
  placeholder = "เลือกผู้คุมสอบ" 
}: SearchableInvigilatorSelectProps) {
  const [query, setQuery] = useState('')

  // Add null check for invigilators array
  const safeInvigilators = invigilators || [];

  const filteredInvigilators = query === ''
    ? safeInvigilators
    : safeInvigilators.filter((inv: Invigilator) => {
        const searchName = inv?.displayName || inv?.name || '';
        return searchName
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(query.toLowerCase().replace(/\s+/g, ''))
      })

  // Pre-filter professors and staff
  const professors = filteredInvigilators.filter((inv: Invigilator) => inv?.isProfessor);
  const staff = filteredInvigilators.filter((inv: Invigilator) => !inv?.isProfessor);

  return (
    <Combobox value={selectedInvigilator} onChange={onChange}>
      <div className="relative mt-1">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            displayValue={(inv: Invigilator | null) => inv ? (inv.displayName || inv.name || '') : ''}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredInvigilators.length === 0 ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                {query !== '' ? 'ไม่พบรายชื่อที่ตรงกับคำค้นหา' : 'ไม่มีรายชื่อผู้คุมสอบในระบบ'}
              </div>
            ) : (
              <>
                {/* กลุ่มอาจารย์ - only show if there are professors */}
                {professors.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">อาจารย์</div>
                    {professors.map((inv: Invigilator) => (
                      <Combobox.Option
                        key={inv.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-blue-600 text-white' : 'text-gray-900'
                          }`
                        }
                        value={inv}
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`block truncate ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {inv.displayName || inv.name}
                              <span className={`ml-2 text-xs ${active ? 'text-blue-100' : 'text-gray-500'}`}>
                                (โควต้า: {inv.assignedQuota || 0}/{inv.quota || 0})
                              </span>
                            </span>
                            {selected ? (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  active ? 'text-white' : 'text-blue-600'
                                }`}
                              >
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Combobox.Option>
                    ))}
                  </>
                )}

                {/* กลุ่มเจ้าหน้าที่ - only show if there are staff */}
                {staff.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">เจ้าหน้าที่</div>
                    {staff.map((inv: Invigilator) => (
                      <Combobox.Option
                        key={inv.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-blue-600 text-white' : 'text-gray-900'
                          }`
                        }
                        value={inv}
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`block truncate ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {inv.displayName || inv.name}
                              <span className={`ml-2 text-xs ${active ? 'text-blue-100' : 'text-gray-500'}`}>
                                (โควต้า: {inv.assignedQuota || 0}/{inv.quota || 0})
                              </span>
                            </span>
                            {selected ? (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  active ? 'text-white' : 'text-blue-600'
                                }`}
                              >
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Combobox.Option>
                    ))}
                  </>
                )}
              </>
            )}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  )
}