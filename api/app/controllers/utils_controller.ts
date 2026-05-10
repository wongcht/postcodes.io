import { Handler } from "../types/express";
import { query } from "../queries/db";
import { NotReadyError } from "../lib/errors";

export const ping: Handler = (_, response, next) => {
  response.jsonApiResponse = {
    status: 200,
    result: "pong",
  };
  next();
};

export const ready: Handler = async (_, response, next) => {
  try {
    await query("SELECT 1");
  } catch (error) {
    return next(new NotReadyError());
  }
  response.jsonApiResponse = {
    status: 200,
    result: "Ready",
  };
  next();
};
