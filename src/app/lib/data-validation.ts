export const validateKMITLEmail = (email: string): boolean => {
    const pattern = /@kmitl\.ac\.th$/;
    return pattern.test(email);
  };

  export const validateData = (data: Record<string, unknown>[], expectedKeys: string[]): boolean => {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.every((row) => expectedKeys.every((key) => key in row));
  };
  