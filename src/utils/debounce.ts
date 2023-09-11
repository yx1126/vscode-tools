export default function debounce(func: Function, delay: number) {
    let timer: any = null;

    return function(this: any, ...args: any[]) {
        if(timer) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
