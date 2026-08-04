import type { FC } from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetHealth } from "@/features/health/hooks/use-health";
import {
    HealthCheckStatus,
    HealthServiceName,
    type HealthCheckStatusType,
    type HealthResponse,
} from "@/features/health/interfaces/health.interfaces";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusStyles: Record<HealthCheckStatusType, string> = {
    [HealthCheckStatus.OK]: "bg-emerald-100 text-emerald-700",
    [HealthCheckStatus.NOT_CONFIGURED]: "bg-gray-100 text-gray-600",
    [HealthCheckStatus.DOWN]: "bg-red-100 text-red-700",
};

const formatDuration = (value?: number) => {
    if (value === undefined) {
        return "—";
    }

    return `${value} ms`;
};

const formatUptime = (value?: number) => {
    if (value === undefined) {
        return "—";
    }

    const totalSeconds = Math.floor(value / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
};

const StatusBadge = ({ status }: { status: HealthCheckStatusType }) => (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", statusStyles[status])}>
        {status.replace("_", " ")}
    </span>
);

const HealthStatusCard = ({
    title,
    description,
    data,
    isLoading,
    isError,
    errorMessage,
}: {
    title: string;
    description: string;
    data?: HealthResponse;
    isLoading: boolean;
    isError: boolean;
    errorMessage?: string;
}) => {
    if (isLoading) {
        return <div className="h-44 rounded-xl border border-gray-200 bg-gray-100 animate-pulse" />;
    }

    if (isError) {
        return (
            <Card className="p-6">
                <p className="text-base font-semibold text-gray-900">{title}</p>
                <p className="mt-1 text-sm text-gray-500">{errorMessage ?? "Unable to load health status."}</p>
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-base font-semibold text-gray-900">{title}</p>
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                </div>
                <StatusBadge status={data.status} />
            </div>

            <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500">Last checked</span>
                    <span className="font-medium text-gray-900">{new Date(data.timestamp).toLocaleString()}</span>
                </div>

                {data.service === HealthServiceName.API ? (
                    <>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-gray-500">Uptime</span>
                            <span className="font-medium text-gray-900">{formatUptime(data.uptime_ms)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-gray-500">Uptime (ms)</span>
                            <span className="font-medium text-gray-900">{data.uptime_ms.toLocaleString()} ms</span>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-500">Response time</span>
                        <span className="font-medium text-gray-900">{formatDuration(data.ms)}</span>
                    </div>
                )}

                {"message" in data && data.message ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600">{data.message}</div>
                ) : null}
            </div>
        </Card>
    );
};

const HealthPage: FC = () => {
    const queryClient = useQueryClient();
    const apiHealth = useGetHealth(HealthServiceName.API);
    const postgresHealth = useGetHealth(HealthServiceName.POSTGRES);
    const redisHealth = useGetHealth(HealthServiceName.REDIS);

    const isFetching = apiHealth.isFetching || postgresHealth.isFetching || redisHealth.isFetching;

    const refreshAll = () => {
        void queryClient.invalidateQueries({ queryKey: ["health"] });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">System Health</h1>
                    <p className="mt-1 text-sm text-gray-500">Live status for the API and connected infrastructure.</p>
                </div>
                <Button variant="outline" className="w-auto" onClick={refreshAll} disabled={isFetching}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <HealthStatusCard
                    title="API"
                    description="Core application availability."
                    data={apiHealth.data}
                    isLoading={apiHealth.isLoading}
                    isError={apiHealth.isError}
                    errorMessage={apiHealth.error instanceof Error ? apiHealth.error.message : undefined}
                />
                <HealthStatusCard
                    title="Postgres"
                    description="Database connectivity via Prisma."
                    data={postgresHealth.data}
                    isLoading={postgresHealth.isLoading}
                    isError={postgresHealth.isError}
                    errorMessage={postgresHealth.error instanceof Error ? postgresHealth.error.message : undefined}
                />
                <HealthStatusCard
                    title="Redis"
                    description="Cache and queue connectivity."
                    data={redisHealth.data}
                    isLoading={redisHealth.isLoading}
                    isError={redisHealth.isError}
                    errorMessage={redisHealth.error instanceof Error ? redisHealth.error.message : undefined}
                />
            </div>
        </div>
    );
};

export default HealthPage;
