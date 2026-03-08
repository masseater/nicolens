import { clsx, type ClassValue } from "clsx"; // oxlint-disable-line consistent-type-specifier-style
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
