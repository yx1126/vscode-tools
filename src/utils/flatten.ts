export default function flatten<T>(list: Array<T>) {
    return list.reduce<T[]>((pre, cur) => {
        const values = Array.isArray(cur) ? flatten(cur) : [cur];
        pre.push(...values);
        return pre;
    }, []);
};
