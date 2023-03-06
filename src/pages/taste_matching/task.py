import os
import sys

import pandas as pd
import json

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from py_package.utils import message


class TasteMatching:

    def __init__(self, opions):
        self.opions = opions
        self.data = pd.DataFrame([])

    def exec(self):
        if self.opions.get('isDataTransfer') == True:
            self.transToJSON()

        self.data = self.get_data()

        date_range = self.get_date_range()

        first_classification, first_classification_ingredient_dict = self.get_first_classification_ingredient(
        )

        second_ingredient_count_dict, second_classification_ingredient_list_dict = self.get_second_classification_ingredient(
            '桃子')

        product_list = self.get_product_list('桃子', '草莓')

        if self.opions.get('isBuildResult') == True:
            self.build_taste_matching_data(
                date_range, first_classification,
                first_classification_ingredient_dict,
                second_ingredient_count_dict,
                second_classification_ingredient_list_dict, product_list)

        return date_range, first_classification, first_classification_ingredient_dict, second_ingredient_count_dict, second_classification_ingredient_list_dict, product_list

    # 读取原始数据,转换为json格式
    def transToJSON(self):
        log_message = 'Excel转换JSON数据'
        try:
            df = pd.read_excel(
                r'./datasource/taste_matching.xlsx').sort_values(by='月份')

            df['月份'] = df['月份'].dt.strftime('%Y-%m')

            df['品牌-产品名称-原料构成'] = df['品牌'] + '-' + df['产品名称'] + '-' + df['原料构成']

            df.to_json('./datasource/taste_matching.json',
                       orient='records',
                       force_ascii=False,
                       indent=4)

            message.get('success')(log_message)
        except Exception as e:
            message.get('error')(log_message, e)

    # 生成业务数据
    def build_taste_matching_data(self, date_range, first_classification,
                                  first_classification_ingredient_dict,
                                  second_ingredient_count_dict,
                                  second_classification_ingredient_list_dict,
                                  product_list):
        log_message = '生成业务数据'
        try:
            with open('./datasource/taste_matching_result.json',
                      'w',
                      encoding='utf-8') as f:
                json.dump(
                    {
                        'date_range': date_range,
                        'first_classification': first_classification,
                        'first_classification_ingredient_dict':
                        first_classification_ingredient_dict,
                        'second_ingredient_count_dict':
                        second_ingredient_count_dict,
                        'second_classification_ingredient_list_dict':
                        second_classification_ingredient_list_dict,
                        'product_list': product_list,
                    },
                    f,
                    ensure_ascii=False,
                    indent=4,
                    separators=(',', ': '))
            message.get('success')(log_message)
        except Exception as e:
            message.get('error')(log_message, e)

    # 读取转换好的原始json数据
    def get_data(self):
        # 使用 Python JSON 模块载入数据
        log_message = '读取数据'
        try:
            with open('./datasource/taste_matching.json',
                      'r',
                      encoding='utf-8') as f:
                origin_data = json.loads(f.read())

            message.get('success')(log_message)
            return pd.json_normalize(origin_data)
        except Exception as e:
            message.get('error')(log_message, e)

    # 获取时间范围
    def get_date_range(self):
        log_message = '获取日期范围'
        try:
            data = self.data
            date_range = data['月份'].drop_duplicates().to_list()
            message.get('success')(log_message)
            return date_range
        except Exception as e:
            message.get('error')(log_message, e)

    # 获取一级分类、一级分类:加工后成分映射关系（去重）
    def get_first_classification_ingredient(self):
        log_message = '一级分类数据计算'
        try:
            data = self.data

            first_classification = data['成分分类'].drop_duplicates().to_list()
            first_classification_ingredient_dict = {}

            for index, row in data.iterrows():
                key = row['成分分类']
                if key in first_classification_ingredient_dict:
                    first_classification_ingredient_dict.get(key).append(
                        row['加工后成分'])
                else:
                    first_classification_ingredient_dict[key] = []

            # 去重处理
            for key, value in first_classification_ingredient_dict.items():
                first_classification_ingredient_dict[key] = list(set(value))
            message.get('success')(log_message)
            return first_classification, first_classification_ingredient_dict
        except Exception as e:
            message.get('error')(log_message, e)

    # 获取品牌-产品名称-原料构成列表作为辅助数据
    def get_unique_product_brand_ingredient_list(self):
        data = self.data
        unique_product_brand_ingredient_list = []
        for index, row in data.iterrows():
            unique_product_brand_ingredient_list.append('-'.join(
                [row['品牌'], row['产品名称'], row['原料构成']]))
        return list(set(unique_product_brand_ingredient_list))

    def get_second_classification_ingredient(self, first_class_ingredient):
        log_message = '二级分类数据计算'

        try:
            data = self.data
            unique_product_brand_ingredient_list = data[
                '品牌-产品名称-原料构成'].drop_duplicates().to_list()
            # 二级成分:出现次数映射关系
            second_ingredient_count_dict = {}

            # 遍历unique_product_brand_ingredient_list,计算二级成分:出现次数映射关系
            for item in unique_product_brand_ingredient_list:
                # 获取品牌、产品名称、原料构成对应的二级成分
                second_ingredient_list = data[data['品牌-产品名称-原料构成'] ==
                                              item]['加工后成分'].to_list()
                # 排除一级成分后的二级成分
                omit_first_second_ingredient_list = list(
                    set(second_ingredient_list) - set(first_class_ingredient))
                # 统计二级成分出现次数
                for ingredient in omit_first_second_ingredient_list:
                    if ingredient in second_ingredient_count_dict:
                        second_ingredient_count_dict[ingredient] += 1
                    else:
                        second_ingredient_count_dict[ingredient] = 1

            # 获取二级创新成分分类:二级创新成分映射关系
            second_classification_ingredient_list_dict = {'all': []}

            # 遍历second_ingredient_count_dict
            for key, value in second_ingredient_count_dict.items():
                # 获取二级成分对应的二级创新成分分类
                second_classification = data[data['加工后成分'] ==
                                             key]['成分分类'].to_list()[0]
                second_classification_ingredient_list_dict['all'].append(key)
                if second_classification in second_classification_ingredient_list_dict:
                    second_classification_ingredient_list_dict[
                        second_classification].append(key)
                else:
                    second_classification_ingredient_list_dict[
                        second_classification] = []

            message.get('success')(log_message)
            return second_ingredient_count_dict, second_classification_ingredient_list_dict
        except Exception as e:
            message.get('error')(log_message, e)

    # 获取产品示例
    def get_product_list(self, first_class_ingredient,
                         second_class_ingredient):
        try:
            log_message = '产品示例计算'
            data = self.data
            # 分别获取一级成分、二级成分对应的品牌-产品名称-原料构成列表
            first_class_product_list = data[
                data['加工后成分'] ==
                first_class_ingredient]['品牌-产品名称-原料构成'].to_list()
            second_class_product_list = data[
                data['加工后成分'] ==
                second_class_ingredient]['品牌-产品名称-原料构成'].to_list()
            # 取交集
            product_list = list(
                set(first_class_product_list).intersection(
                    second_class_product_list))

            message.get('success')(log_message)
            return product_list
        except Exception as e:
            message.get('error')(log_message, e)


tasteMatching = TasteMatching({
    'isDataTransfer': True,
    'isBuildResult': True,
})

tasteMatching.exec()