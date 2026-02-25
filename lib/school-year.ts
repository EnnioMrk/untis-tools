/**
 * Calculate the start of the current school year based on holidays
 * This is used to determine the date range for fetching timetable and absence data
 */

const SCHOOL_HOLIDAY_API_URL = 'https://openholidaysapi.org/SchoolHolidays';

interface Holiday {
    name: Array<{ text: string }>;
    endDate: string;
}

/**
 * Get the school year start date by finding the most recent major holiday
 * (Halbjahresferien or Sommerferien) that has ended
 */
export async function getSchoolYearStart(grade?: string): Promise<Date> {
    const date = new Date();
    let year: number;
    
    // School year typically starts in August/September
    // If we're after July, we're in the latter half of the school year
    if (date.getMonth() > 7) {
        year = date.getFullYear();
    } else {
        year = date.getFullYear() - 1;
    }

    // Different grades may have different holiday patterns
    let holidayNames = ['Halbjahresferien', 'Sommerferien'];
    if (grade && grade.startsWith('13')) {
        // Year 13 (Abitur year) has different holidays
        holidayNames = ['Weihnachtsferien', 'Sommerferien'];
    }

    try {
        const response = await fetch(
            `${SCHOOL_HOLIDAY_API_URL}?countryIsoCode=DE&subdivisionCode=DE-NI&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${year + 1}-12-30`
        );
        
        if (!response.ok) {
            console.warn('[getSchoolYearStart] Failed to fetch holidays, using fallback');
            return getDefaultSchoolYearStart();
        }

        const data: Holiday[] = await response.json();

        // Filter for relevant holidays that have already ended
        const filteredHolidays = data
            .filter((h) =>
                holidayNames.some((name) => h.name[0]?.text.includes(name))
            )
            ?.filter((h) => new Date(h.endDate) < new Date())
            ?.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

        if (filteredHolidays && filteredHolidays.length > 0) {
            // The school year starts after the most recent major holiday
            const schoolYearStart = new Date(filteredHolidays[0].endDate);
            schoolYearStart.setDate(schoolYearStart.getDate() + 1);
            return schoolYearStart;
        }
    } catch (error) {
        console.warn('[getSchoolYearStart] Error fetching holidays:', error);
    }

    // Fallback: assume school year starts on August 15th of the previous year
    return getDefaultSchoolYearStart();
}

/**
 * Fallback function to get school year start when API fails
 * Assumes school year starts around mid-August
 */
function getDefaultSchoolYearStart(): Date {
    const date = new Date();
    let year: number;
    
    if (date.getMonth() > 7) {
        year = date.getFullYear();
    } else {
        year = date.getFullYear() - 1;
    }
    
    // Default to August 15th
    const schoolYearStart = new Date(year, 7, 15); // Month is 0-indexed, so 7 = August
    return schoolYearStart;
}
