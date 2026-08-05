import axios from "axios";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { HealthResponse, HealthScope } from "../interfaces/health.interfaces";
import { HealthServiceName } from "../interfaces/health.interfaces";

const getHealthParams = (scope: HealthScope) => {
    if (scope === HealthServiceName.POSTGRES) {
        return { postgres: "true" };
    }

    if (scope === HealthServiceName.REDIS) {
        return { redis: "true" };
    }

    return undefined;
};

const isHealthResponse = (payload: unknown): payload is HealthResponse => {
    if (!payload || typeof payload !== "object") {
        return false;
    }

    const record = payload as Record<string, unknown>;

    return (
        typeof record.service === "string" &&
        typeof record.status === "string" &&
        typeof record.timestamp === "string"
    );
};

export const getHealth = async (scope: HealthScope): Promise<HealthResponse> => {
    try {
        const response = await axiosInstance.get<HealthResponse>(ApiRoutes.health.prefix, {
            params: getHealthParams(scope),
            validateStatus: (status) => status === 200 || status === 503,
        });

        if (!isHealthResponse(response.data)) {
            throw new Error("Invalid health response. Please try again.");
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (!error.response) {
                throw new Error(
                    "Cannot reach the API. Make sure the backend is running on port 3000.",
                );
            }

            if (error.response.data && isHealthResponse(error.response.data)) {
                return error.response.data;
            }
        }

        if (error instanceof Error) {
            throw error;
        }

        throw new Error("Failed to fetch health status. Please try again.");
    }
};
