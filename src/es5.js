export default {
  propertyIsWritable: (obj, prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    return !!(!descriptor || descriptor.writable || descriptor.set);
  }
}