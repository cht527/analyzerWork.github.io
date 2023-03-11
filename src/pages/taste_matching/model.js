class TasteMatching {
  data = [];
  computedData = {
    currentData: [],
    firstClassification: [],
    firstClassificationIngredientMap: new Map(),
    startIndex: 0,
    endIndex: 0,
    secondIngredientCountMap: new Map(),
    secondClassificationIngredientListMap: new Map(),
    selectedFirstIngredient: "",
    selectedSecondIngredient: "",
  };
  classificationPriorityMap = new Map([
    ["果味", 6],
    ["茶底", 5],
    ["花香", 4],
    ["其他口味", 3],
    ["乳基底", 2],
    ["小料", 1],
  ]);
  element = {
    $datePicker: document.querySelector("#taste-matching-date-picker"),
    $firstClassPanel: document.querySelector("#firstClassPanel"),
    $secondClassPanel: document.querySelector("#secondClassPanel"),
    $secondPanel: document.querySelector(".second-class-section"),
    $productDialog: document.querySelector("#productDialog"),
    $productTbody: document.querySelector("#productTbody"),
    $productLoading: document.querySelector("#productLoading"),
    $productTable: document.querySelector("#productTable"),
  };
  timer = {};
  constructor(initData) {
    this.init(initData);
    this.bind();
  }

  init = (initData) => {
    this.data = initData;
    const dateRange = [...new Set(this.data.map((item) => item["月份"]))];
    const lastDate = dateRange[dateRange.length - 1];
    this.element.$datePicker.value = `${lastDate} 至 ${lastDate}`;
    this.element.$datePicker.min = dateRange[0];
    this.element.$datePicker.max = lastDate;
    const startIndex = this.data.findIndex((d) => d["月份"] === lastDate);
    const endIndex = this.data.findLastIndex((d) => d["月份"] === lastDate);
    this.set({
      currentData: this.data.slice(startIndex, endIndex),
    });
    this.getFirstClassificationIngredient(0, this.data.length - 1);
    this.renderFirstClassificationIngredient();
    this.element.$productDialog.setParams({
      buttons: [],
    });
  };


  get = (...keys) =>
    keys.reduce(
      (prev, key) => ({
        ...prev,
        [key]: this.computedData[key],
      }),
      {}
  );

  set = (data) => {
    this.computedData = {
      ...this.computedData,
      ...data,
    };
  };

  bind = () => {
    const instance = this;
    this.element.$datePicker.addEventListener("change", function () {
      instance.dateChangeHandler(this.value);
    });

    this.element.$firstClassPanel.addEventListener(
      "click",
      this.firstIngredientClickHandler
    );

    this.element.$secondClassPanel.addEventListener(
      "click",
      this.secondIngredientClickHandler,
    );

    this.element.$productDialog.addEventListener('hide', event => {
      this.element.$productLoading.classList.remove('hide');
      this.element.$productTable.classList.add('hide');   
      window.clearTimeout(this.timer.productLoading);    
    })

    this.element.$productDialog.addEventListener('show', event => {
      this.timer.productLoading = window.setTimeout(() => {
        this.element.$productLoading.classList.add('hide');
        this.element.$productTable.classList.remove('hide');
      }, 2000)         
    })

  };

  dateChangeHandler(dateRange) {
    const [startDate, endDate] = dateRange
      .split("至")
      .map((value) => value.trim());
    const startIndex = this.data.findIndex((d) => d["月份"] === startDate);
    const endIndex = this.data.findLastIndex((d) => d["月份"] === endDate);
    this.set({
      currentData: this.data.slice(startIndex, endIndex),
    });
    // 清除已选
    this.set({
      selectedFirstIngredient: "",
      selectedSecondIngredient: "",
    });
    // 隐藏二级
    this.element.$secondPanel.classList.add("hide");
    this.getFirstClassificationIngredient();
    this.renderFirstClassificationIngredient();
  }

  firstIngredientClickHandler = (e) => {
    const activeEle = e.target;
    // 标签点击
    if (
      activeEle.classList.contains("ingredient-item") &&
      !activeEle.classList.contains("first-ingredient-item-selected")
    ) {
      if (this.element.$secondPanel.classList.contains("hide")) {
        this.element.$secondPanel.classList.remove("hide");
      }
      const currentSelectedItem = document.querySelector(
        ".first-ingredient-item-selected"
      );
      if (currentSelectedItem) {
        currentSelectedItem.classList.replace(
          "first-ingredient-item-selected",
          "first-ingredient-item"
        );
      }
      const nextSelectedItem = document.querySelector(
        `.first-panel [data-name=${activeEle.dataset.name}]`
      );
      if (nextSelectedItem) {
        nextSelectedItem.classList.replace(
          "first-ingredient-item",
          "first-ingredient-item-selected"
        );
        this.set({
          selectedFirstIngredient: activeEle.dataset.name,
        });
        this.getSecondClassificationIngredient();
        this.renderSecondClassificationIngredient(activeEle.dataset.name);
        this.element.$secondClassPanel.scrollIntoView({behavior: 'smooth'});
      }
    }
  };

  secondIngredientClickHandler = (e) => {
    let activeEle = e.target;
    const isTagChild = ['ingredientText','ingredientHeat'].includes(activeEle.id);
    activeEle = isTagChild ? activeEle.parentNode : activeEle;
    // 标签点击
    if (
      activeEle.classList.contains("ingredient-item")
    ) {
    
      if(!activeEle.classList.contains("second-ingredient-item-selected")){
        const currentSelectedItem = document.querySelector(
          ".second-ingredient-item-selected"
        );
        if (currentSelectedItem) {
          currentSelectedItem.classList.replace(
            "second-ingredient-item-selected",
            "second-ingredient-item"
          );
        }
        const nextSelectedItem = document.querySelector(
          `.second-panel [data-name=${activeEle.dataset.name}]`
        );
        if (nextSelectedItem) {
          nextSelectedItem.classList.replace(
            "second-ingredient-item",
            "second-ingredient-item-selected"
          );
          this.set({
            selectedSecondIngredient: activeEle.dataset.name,
          });
          const { selectedFirstIngredient } = this.get("selectedFirstIngredient");
  
          const productList = this.computeProduction(
            selectedFirstIngredient,
            activeEle.dataset.name
          );
  
          this.loadProductList(productList);
        }
      } else {
        this.element.$productDialog.show();
      }
      
    }
  };

  getFirstClassificationIngredient = () => {
    const { currentData } = this.get("currentData");
    const firstClassification = [
      ...new Set(currentData.map((item) => item["成分分类"])),
    ];
    const firstClassificationIngredientMap = new Map();

    currentData.forEach((item) => {
      if (firstClassificationIngredientMap.has(item["成分分类"])) {
        firstClassificationIngredientMap.set(
          item["成分分类"],
          firstClassificationIngredientMap
            .get(item["成分分类"])
            .concat(item["加工后成分"])
        );
      } else {
        firstClassificationIngredientMap.set(item["成分分类"], [
          item["加工后成分"],
        ]);
      }
    });

    // 加工后成分去重
    for (let [key, value] of firstClassificationIngredientMap.entries()) {
      firstClassificationIngredientMap.set(key, [...new Set(value)]);
    }

    this.set({
      firstClassification,
      firstClassificationIngredientMap,
    });
  };

  renderFirstClassificationIngredient = (selectedIngredient) => {
    const { firstClassificationIngredientMap } = this.get(
      "firstClassificationIngredientMap"
    );
    const firstPanelFragment = document.createDocumentFragment();
    const firstClassificationIngredientArray = [
      ...firstClassificationIngredientMap,
    ].map(([classification, ingredientList]) => ({
      classification,
      ingredientList,
      priority: this.classificationPriorityMap.get(classification),
    }));

    const resortFirstClassificationIngredient =
      firstClassificationIngredientArray
        .sort((a, b) => b.priority - a.priority)
        .filter(({ classification }) => classification !== "小料");
    for (let {
      classification,
      ingredientList,
    } of resortFirstClassificationIngredient) {
      const panelItemInstance = new PanelItem({
        type: "first",
        classification,
        ingredientList,
        selectedIngredient,
      });
      firstPanelFragment.appendChild(panelItemInstance.produce());
    }
    this.element.$firstClassPanel.replaceChildren(firstPanelFragment);
  };

  getSecondClassificationIngredient = () => {
    const { currentData, selectedFirstIngredient } = this.get(
      "currentData",
      "selectedFirstIngredient"
    );
    const uniqueProductBrandIngredientList = [
      ...new Set(
        currentData
          .filter((data) => data["加工后成分"] === selectedFirstIngredient)
          .map((item) => item["品牌-产品名称-原料构成"])
      ),
    ];

    // 二级成分:出现次数映射关系
    const secondIngredientCountMap = new Map();

    // 计算二级成分:出现次数映射关系
    for (let item of uniqueProductBrandIngredientList) {
      // 获取品牌、产品名称、原料构成对应的二级成分
      const secondIngredientList = currentData
        .filter((data) => data["品牌-产品名称-原料构成"] === item)
        .map((data) => data["加工后成分"]);

      // 排除一级成分后的二级成分
      const omitFirstSecondIngredientList = secondIngredientList.filter(
        (ingredient) => ingredient !== selectedFirstIngredient
      );

      // 统计二级成分出现次数
      for (let ingredient of omitFirstSecondIngredientList) {
        if (secondIngredientCountMap.has(ingredient)) {
          secondIngredientCountMap.set(
            ingredient,
            secondIngredientCountMap.get(ingredient) + 1
          );
        } else {
          secondIngredientCountMap.set(ingredient, 1);
        }
      }
    }

    // 获取二级创新成分分类:二级创新成分映射关系
    const secondClassificationIngredientListMap = new Map();

    for (let [ingredient] of secondIngredientCountMap.entries()) {
      // 获取二级成分对应的二级创新成分分类
      const secondClassificationList = currentData
        .filter((data) => data["加工后成分"] === ingredient)
        .map((data) => data["成分分类"]);
      const [secondClassification] = secondClassificationList;

      if (secondClassificationIngredientListMap.has(secondClassification)) {
        secondClassificationIngredientListMap.set(
          secondClassification,
          secondClassificationIngredientListMap
            .get(secondClassification)
            .concat(ingredient)
        );
      } else {
        secondClassificationIngredientListMap.set(secondClassification, [
          ingredient,
        ]);
      }
    }

    this.set({
      secondIngredientCountMap,
      secondClassificationIngredientListMap,
    });
  };

  renderSecondClassificationIngredient = () => {
    const { secondClassificationIngredientListMap, selectedSecondIngredient } =
      this.get(
        "secondClassificationIngredientListMap",
        "selectedSecondIngredient"
      );
    const secondPanelFragment = document.createDocumentFragment();
    // '其他口味'的索引
    const secondClassificationIngredientArray = [
      ...secondClassificationIngredientListMap,
    ].map(([classification, ingredientList]) => ({
      classification,
      ingredientList,
      priority: this.classificationPriorityMap.get(classification),
    }));

    const resortSecondClassificationIngredient =
      secondClassificationIngredientArray.sort(
        (a, b) => b.priority - a.priority
      );

    const secondClassificationWithCount =
      this.getClassificationIngredientListTopN(
        resortSecondClassificationIngredient,
        10
      );

    for (let {
      classification,
      ingredientListWithCount,
    } of secondClassificationWithCount) {
      const panelItemInstance = new PanelItem({
        type: "second",
        classification,
        ingredientList: ingredientListWithCount,
        selectedSecondIngredient,
      });
      secondPanelFragment.appendChild(panelItemInstance.produce());
    }
    this.element.$secondClassPanel.replaceChildren(secondPanelFragment);
  };

  getClassificationIngredientListTopN = (
    resortSecondClassificationIngredient,
    n
  ) => {
    const { secondIngredientCountMap } = this.get("secondIngredientCountMap");

    return resortSecondClassificationIngredient.map(
      ({ classification, ingredientList }) => ({
        classification,
        ingredientListWithCount: ingredientList
          .map((ingredient) => ({
            ingredient,
            count: secondIngredientCountMap.get(ingredient),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, n),
      })
    );
  };

  computeProduction = (firstIngredient, secondIngredient) => {
    const { currentData } = this.get("currentData");
    const firstIngredientList = currentData
      .filter((data) => data["加工后成分"] === firstIngredient)
      .map((data) => data["品牌-产品名称-原料构成"]);
    const secondIngredientList = currentData
      .filter((data) => data["加工后成分"] === secondIngredient)
      .map((data) => data["品牌-产品名称-原料构成"]);
    const intersectionList = firstIngredientList.filter((item) =>
      secondIngredientList.includes(item)
    );

    return [...new Set(intersectionList)];
  };

  loadProductList = (productList) => {
    this.element.$productTbody.innerHTML = null;
    const tbodyFragment = document.createDocumentFragment();
    productList.forEach((item) => {
      const tr = document.createElement("tr");
      item.split("-").forEach((value) => {
        const td = document.createElement("td");
        td.innerHTML = value;
        tr.appendChild(td);
      });
      tbodyFragment.appendChild(tr);
    });

    this.element.$productTbody.appendChild(tbodyFragment);

    this.element.$productDialog.show();
  };
}

class PanelItem {
  constructor({ type, classification, ingredientList, selectedIngredient }) {
    this.type = type;
    this.classification = classification;
    this.ingredientList = ingredientList;
    this.selectedIngredient = selectedIngredient;
  }

  produce = () => {
    const { type, classification, ingredientList, selectedIngredient } = this;
    const panelEle = document.createElement("div");
    panelEle.className = `panel ${type}-panel ${type}-panel-${classification}`;
    panelEle.innerHTML = `<div class='pannel-title-container'>
    <div class='panel-title ${type}-panel-title'>${classification}</div>

    </div>`;
    const ingredientWraper = document.createElement("div");
    ingredientWraper.className = `ingredient-wrapper ${type}-ingredient-wrapper`;
    const panelFragment = document.createDocumentFragment();
    if (type === "first") {
      ingredientList.forEach((ingredient) => {
        const ingredientItem = document.createElement("div");
        ingredientItem.dataset.name = ingredient;
        ingredientItem.className = `ingredient-item ${
          selectedIngredient === ingredient
            ? `${type}-ingredient-item-selected`
            : `${type}-ingredient-item`
        }`;
        ingredientItem.innerHTML = ingredient;
        panelFragment.appendChild(ingredientItem);
      });
    } else if (type === "second") {
      ingredientList.forEach(({ ingredient, count }) => {
        const ingredientItem = document.createElement("div");
        ingredientItem.dataset.name = ingredient;
        ingredientItem.className = `ingredient-item ${
          selectedIngredient === ingredient
            ? `${type}-ingredient-item-selected`
            : `${type}-ingredient-item`
        }`;
        ingredientItem.innerHTML = `<span id="ingredientText" >${ingredient}</span> <span id="ingredientHeat">${count}°</span>`;
        panelFragment.appendChild(ingredientItem);
      });
    }

    ingredientWraper.appendChild(panelFragment);
    panelEle.appendChild(ingredientWraper);

    return panelEle;
  };
}
