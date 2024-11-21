export const validateKMITLEmail = (email: string): boolean => {
    const pattern = /@kmitl\.ac\.th$/;
    return pattern.test(email);
  };