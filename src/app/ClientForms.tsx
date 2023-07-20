"use client";

import { useState } from "react";
import NextImage from "next/image";

import { FastAverageColor } from "fast-average-color";
import { MdClose } from "react-icons/md";

const fac = new FastAverageColor();

export default function ClientSideComponent() {
  const NUM_RESULTS = 5;
  const RESAMPLE_SIZE = 480;

  const [images, setImages] = useState({
    fileInput1: [],
    fileInput2: [],
    fileInput3: [],
  });

  const [blendScores, setBlendScores] = useState(Array(NUM_RESULTS));

  const [selectedImages, setSelectedImages] = useState(
    Array(NUM_RESULTS).fill({
      fileInput1: null,
      fileInput2: null,
      fileInput3: null,
    }),
  );

  const handleImageChange = async (e) => {
    const _files = await Promise.all(
      Array.from(e.target.files).map(async (file) => {
        return await resizeImageFile(file, RESAMPLE_SIZE);
      }),
    );

    setImages((prev) => ({
      ...prev,
      [e.target.name]: [...prev[e.target.name], ..._files],
    }));
  };

  const handleImageRemove = (fileInput, index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[fileInput][index]);
      const updatedImages = [...prev[fileInput]];
      updatedImages.splice(index, 1);
      return { ...prev, [fileInput]: updatedImages };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let colorData = {};
    let combinations = [];

    // extract colors
    for (const fileInput in images) {
      colorData[fileInput] = await Promise.all(
        images[fileInput].map(async (image: File, idx: number) => {
          const imgSrc = URL.createObjectURL(image);

          const averageColor = await getDominantColor(imgSrc);

          URL.revokeObjectURL(imgSrc);

          console.log(
            idx + 1 + " %c___",
            `background: rgb(${averageColor.map((c) => c * 255).join(",")});
            color: rgb(${averageColor.map((c) => c * 255).join(",")})`,
          );
          return averageColor;
        }),
      );
      console.log("\n");
    }

    for (const [idx1, color1] of colorData["fileInput1"].entries()) {
      for (const [idx2, color2] of colorData["fileInput2"].entries()) {
        for (const [idx3, color3] of colorData["fileInput3"].entries()) {
          let score = [
            // 1-calculateColorDifference(color1, color2),
            calculateColorDifference(color2, color1),
            calculateColorDifference(color2, color3),
          ];
          score = score.map((s) => (1 - s) / 2);
          combinations.push({
            score,
            indicies: [idx1, idx2, idx3],
          });
        }
      }
    }

    combinations.sort(
      (a, b) =>
        b.score.reduce((a, b) => a + b, 0) - a.score.reduce((a, b) => a + b, 0),
    );

    // only keep {NUM_RESULTS} results which contain images that have at least two distinct images
    let top_combinations = [];

    // for (const combination of combinations) {
    //   // ignore if top_combintations already contains a combination with two images that this combination has
    //   const doesRepeat = top_combinations.some((top_combination) => {
    //     return atLeastTwoInCommon(
    //       top_combination.indicies,
    //       combination.indicies,
    //     );
    //   });
    //   if (doesRepeat) continue;
    //
    //   top_combinations.push(combination);
    // }
    top_combinations = combinations;

    top_combinations = top_combinations.slice(0, NUM_RESULTS);

    // indicies to images
    const images_arr = Object.values(images);
    top_combinations = top_combinations.map((combination) => {
      combination.images = combination.indicies.map(
        (index: number, idx: number) =>
          URL.createObjectURL(images_arr[idx][index]),
      );
      return combination;
    });

    setBlendScores(
      top_combinations.map(
        (c) =>
          `${Math.round((c.score[0] + Number.EPSILON) * 100)} + ${Math.round(
            (c.score[1] + Number.EPSILON) * 100,
          )} = ${Math.round((c.score[0] + c.score[1] + Number.EPSILON) * 100)}`,
      ),
    );
    setSelectedImages(top_combinations.map((c) => c.images));
  };

  const previewImages = (fileInput) => {
    return images[fileInput].map((file, index) => (
      <div
        key={fileInput + index}
        className="relative group cursor-pointer"
        onClick={() => handleImageRemove(fileInput, index)}
      >
        <NextImage
          className="w-24 h-24 md:w-32 md:h-32 object-cover transition-all duration-200 ease-in-out transform group-hover:scale-105"
          src={URL.createObjectURL(file)}
          alt=""
          width={96}
          height={96}
          objectFit="cover"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-white bg-opacity-75 rounded-full p-1">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="container mx-auto grid place-items-center py-8">
      <form onSubmit={handleSubmit}>
        {["fileInput1", "fileInput2", "fileInput3"].map((inputName, f_idx) => (
          <div key={inputName} className="flex flex-col items-center">
            <label
              className="self-start block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
              htmlFor={`multiple_files_${inputName}`}
            >
              Upload multiple files -
              {` ${inputName.charAt(inputName.length - 1)}`}
            </label>
            <input
              type="file"
              multiple
              name={inputName}
              onChange={handleImageChange}
              id={`multiple_files_${inputName}`}
              className={`block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 hover:text-gray-200 dark:hover:text-gray-300 transition${
                f_idx == 1 && " border-blue-400 dark:border-blue-800"
              }`}
            />
            <div className="flex flex-wrap gap-4 my-4">
              {previewImages(inputName)}
            </div>
            <hr className="w-48 h-1 mx-auto my-4 bg-gray-400 border-0 rounded md:my-6 dark:bg-gray-700" />
          </div>
        ))}

        <div className="flex flex-col items-center">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md"
          >
            Blend
          </button>
        </div>
      </form>

      <hr className="h-px my-8 bg-gray-200 border-0 dark:bg-gray-400 w-96" />

      {blendScores.map((blendScore, index) => (
        <div key={index} className="flex flex-col item-center py-3">
          <h2>
            Blend Score {index + 1}: <b>{blendScore}</b>
          </h2>

          <div className="flex flex-wrap space-x-2">
            {Object.keys(selectedImages[index]).map((fileInput, index2) => {
              if (selectedImages[index][fileInput]) {
                return (
                  <NextImage
                    className="flex-auto w-28 h-28 md:w-52 md:h-52 object-cover"
                    alt=""
                    key={fileInput + index2}
                    src={selectedImages[index][fileInput]}
                    width={208}
                    height={208}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const calculateColorDifference = (colorA, colorB) => {
  let difference = 0;

  if (colorA && colorB) {
    const rMean = (colorA[0] - colorB[0]) / 2;
    const r = colorA[0] - colorB[0];
    const g = colorA[1] - colorB[1];
    const b = colorA[2] - colorB[2];

    // difference = Math.sqrt(
    //   (((512 + rMean) * r * r) >> 8) +
    //     4 * g * g +
    //     (((767 - rMean) * b * b) >> 8),
    // );
    // difference = Math.sqrt(r * r + g * g + b * b);
    difference = Math.abs(r) + Math.abs(g) + Math.abs(b);
    // difference = difference / 3;
  }

  return difference;
};

async function getDominantColor(image) {
  const imageData = await getPixelData(image);
  const { width, height, data } = imageData;

  //const colors = await extractColors(imageData);

  // const averageColor = colors
  //   .reduce(
  //     (acc, color, idx) => {
  //       color.rgb = [color.red, color.green, color.blue];
  //
  //       for (let i = 0; i < 3; i++) {
  //         acc[i] += color.rgb[i] / 255;
  //       }
  //       return acc;
  //     },
  //     [0, 0, 0],
  //   )
  //   .map((avgColor) => avgColor / colors.length);

  const averageColor = imageData.data
    .reduce(
      (acc, color, idx) => {
        if (idx % 4 === 0) {
          acc[0] += color / 255;
        } else if (idx % 4 === 1) {
          acc[1] += color / 255;
        } else if (idx % 4 === 2) {
          acc[2] += color / 255;
        }
        return acc;
      },
      [0, 0, 0],
    )
    .map((avgColor) => avgColor / (imageData.data.length / 4));

  // let averageColor = await fac.getColorAsync(image);

  // averageColor = averageColor.value.slice(0, 3).map((c) => c / 255);

  return averageColor;
}

async function getPixelData(imgSrc: string) {
  const image = new Image();
  image.src = imgSrc;
  await new Promise((resolve) => (image.onload = resolve));
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function atLeastTwoInCommon(arr1: Array<any>, arr2: Array<any>): boolean {
  const commonItems = arr1.filter((item) => arr2.includes(item));
  return commonItems.length >= 2;
}

function resizeImageFile(file, maxDim) {
  return new Promise((resolve, reject) => {
    // Create an HTMLImageElement
    const img = document.createElement("img");

    // Set the src to a URL representing the File
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      // Create a Canvas and a CanvasRenderingContext2D
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let width, height;

      // Determine the new dimensions of the image.
      if (img.width > img.height) {
        if (img.width > maxDim) {
          width = maxDim;
          height = Math.round((img.height / img.width) * maxDim);
        } else {
          width = img.width;
          height = img.height;
        }
      } else {
        if (img.height > maxDim) {
          height = maxDim;
          width = Math.round((img.width / img.height) * maxDim);
        } else {
          width = img.width;
          height = img.height;
        }
      }

      // Set the canvas dimensions to the new size
      canvas.width = width;
      canvas.height = height;

      console.log(width, height);

      // Draw the image onto the canvas, resizing it
      ctx.drawImage(img, 0, 0, width, height);

      // Get a Blob representing the resized image
      canvas.toBlob((blob) => {
        // Create a new File from the Blob and resolve it
        const newFile = new File([blob], file.name, { type: blob.type });
        resolve(newFile);
      }, file.type);
    };

    img.onerror = reject;
  });
}
