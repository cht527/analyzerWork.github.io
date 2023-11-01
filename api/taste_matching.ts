import { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoClient, WithId } from "mongodb";
import { CONNECTION_URL, SELECT_ALL } from "./constants";
import { Dictionary } from "./type";
const client = new MongoClient(CONNECTION_URL);

enum QueryTypeEnum {
  Init = "init",
  FetchData = "fetchData",
}

type PrivateDataItem = WithId<{
  月份: string;
  品牌: string;
  产品名称: string;
  原料构成: string;
  基础成分: string;
  成分分类: string;
  加工后成分: string;
  品牌类型: string;
  产品类型: string;
  "品牌-产品名称-原料构成": string;
}>;

module.exports = async (req: VercelRequest, res: VercelResponse) => {
  await client.connect();
  console.log("Connected successfully to server");

  const db = await client.db("private");
  let targetData: PrivateDataItem[] = [];
  let otherData: Dictionary = {};
  console.log('req.query',req.query);
  
  switch (req.query.name) {
    case QueryTypeEnum.Init:
      const allData = await db.collection<PrivateDataItem>("data").find();
      const allDataArray = await allData.toArray();
      const [firstItem] = allDataArray;
      const lastItem = allDataArray[allDataArray.length - 1];
      const minDate = firstItem["月份"];
      const maxDate = lastItem["月份"];
      const brandSelectOptions = [
        ...new Set(allDataArray.map((item) => item["品牌类型"])),
      ];
      const productSelectOptions = [
        ...new Set(allDataArray.map((item) => item["产品类型"])),
      ];
      otherData = {
        minDate,
        maxDate,
        brandSelectOptions,
        productSelectOptions,
      };

      break;

    case QueryTypeEnum.FetchData:
      const {
        startDate,
        endDate,
        brandTypeValue,
        productTypeValue,
      } = req.query as {
        [key: string]: string;
      };

      const dataSlice = await db
        .collection<PrivateDataItem>("data")
        .find({ 月份: { $gte: startDate, $lte: endDate } }).toArray();

        const dataFilterByBrand =
        !brandTypeValue || brandTypeValue[0] === SELECT_ALL
          ? dataSlice
          : dataSlice.filter((item) => brandTypeValue.includes(item["品牌类型"]));
      const dataFilterByProduct =
        productTypeValue[0] === SELECT_ALL
          ? dataFilterByBrand
          : dataFilterByBrand.filter((item) =>
              productTypeValue.includes(item["产品类型"])
            );

      targetData = dataFilterByProduct;
      break;
    default:
      targetData = [];
      break;
  }
  const data = {
    result: {
      targetData,
      otherData,
    },
  };
  res.setHeader("access-control-allow-origin", "*").status(200).json(data);
};
