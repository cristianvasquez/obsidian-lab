let pythonImplementation: (parameter:Parameter)=> Promise<Item[]> = function (parameter: Parameter) {
  return new Promise<Item[]>((resolve, reject) => {
    let result = [
      {
        path: 'index.md',
        basename: 'index.md',
        info: {
          label: 'This comes from a dummy implementation',
        },
      },
    ];
    resolve(result);
  });
};

export { pythonImplementation };