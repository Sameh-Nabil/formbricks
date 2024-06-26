import z from "zod";

// Helper function to calculate difference in days between two dates
export const diffInDays = (date1: Date, date2: Date) => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

function isZodDate(schema: z.ZodTypeAny): boolean {
  // Check if the field is a ZodDate
  if (schema instanceof z.ZodDate) {
    return true;
  }

  // Check if the field is a nullable type and the inner type is ZodDate
  if (schema instanceof z.ZodNullable && schema._def.innerType instanceof z.ZodDate) {
    return true;
  }

  return false;
}

export function formatDateFields<T extends z.ZodRawShape>(
  object: z.infer<z.ZodObject<T>>,
  zodSchema: z.ZodObject<T>
): z.infer<typeof zodSchema> {
  const schemaFields = zodSchema.shape;
  const formattedObject = { ...object };

  for (const key in schemaFields) {
    if (Object.prototype.hasOwnProperty.call(schemaFields, key) && isZodDate(schemaFields[key])) {
      const dateStr = (formattedObject as any)[key];
      try {
        if (typeof dateStr === "string") {
          (formattedObject as any)[key] = new Date(dateStr);
        }
      } catch (error) {
        console.error(`Error parsing date for key ${key}:`, error);
      }
    }
  }

  return formattedObject as z.infer<typeof zodSchema>;
}
export const formatDateWithOrdinal = (date: Date): string => {
  const getOrdinalSuffix = (day: number) => {
    const suffixes = ["th", "st", "nd", "rd"];
    const relevantDigits = day < 30 ? day % 20 : day % 30;
    return suffixes[relevantDigits <= 3 ? relevantDigits : 0];
  };

  const dayOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayOfWeek = dayOfWeekNames[date.getDay()];
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  return `${dayOfWeek}, ${monthNames[monthIndex]} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

export function isValidDateString(value: string) {
  const regex = /^(?:\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/;

  if (!regex.test(value)) {
    return false;
  }

  const date = new Date(value);
  return date;
}
