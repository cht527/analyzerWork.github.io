"""
大数据表处理
"""
import os
import sys
import pandas as pd

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


from py_package.utils import message, format_month

print(pd.__version__)


class BigDataTask:

    def __init__(self, options):
        self.options = options
        self.data = pd.DataFrame([])

    def exec(self, file_name):
        if self.options.get('isDataTransfer') == True:
            self.transToJSON(file_name)

    # 读取原始数据,转换为json格式
    def transToJSON(self,file_name):
        log_message = '{}.xlsx - Excel 转换 JSON 数据'.format(file_name)
        try:
            print('../pages/datasource/{}.xlsx'.format(file_name))
            df = pd.read_excel(
                r'../pages/datasource/{}.xlsx'.format(file_name),)
            df['月份'] = df['月份'].astype(str).apply(format_month)
            df = df.sort_values(by='月份')
            df.to_json('../pages/datasource/{}.json'.format(file_name),
                       orient='records',
                       force_ascii=False,
                       indent=4)

            message.get('success')(log_message)
        except Exception as e:
            message.get('error')(log_message, e)


bigDataTaskInstance = BigDataTask({
    'isDataTransfer': True,
})



bigDataTaskInstance.exec('bigdata_pgc')
bigDataTaskInstance.exec('bigdata_ugc')


# test case
# first_classification, first_classification_ingredient_dict = tasteMatching.get_first_classification_ingredient(
#         )

# second_ingredient_count_dict, second_classification_ingredient_list_dict = tasteMatching.get_second_classification_ingredient(
#             '桃子')

# product_list = tasteMatching.get_product_list('桃子', '草莓')
