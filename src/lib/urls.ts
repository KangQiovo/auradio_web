export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const route = (path = '') => `${base}/${path.replace(/^\//, '')}`;
export const repo = 'https://github.com/KangQiovo/auradio_web';
