
export function toArray<T>(value: Arrayable<T>): T[] {
    if(!value) return [];
    return Array.isArray(value) ? value : [value];
}
