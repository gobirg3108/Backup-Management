export const retryOperation = async (
  operation,
  retries = 3,
  delay = 5000
) => {

  for (let i = 1; i <= retries; i++) {

    try {

      return await operation();

    } catch (error) {

      console.log(
        `Retry Attempt ${i} Failed`
      );

      if (i === retries) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }
};