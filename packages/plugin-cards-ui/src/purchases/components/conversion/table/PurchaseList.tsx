import Button from "@erxes/ui/src/components/Button";
import { __ } from "@erxes/ui/src/utils/core";
import { IPurchase } from "@erxes/ui-cards/src/purchases/types";
import * as React from "react";
import { CenterButton, Purchases, SubHead } from "../style";
import PurchaseItem from "./PurchaseItem";

type Props = {
  purchases: IPurchase[];
  hasMore: boolean;
  loadMore: () => void;
};

export default class PurchaseList extends React.Component<Props> {
  static readonly defaultProps = {
  };

  render() {
    const { purchases } = this.props;
    const contents = purchases.map((purchase, index) => (
      <PurchaseItem key={index} purchase={purchase} />
    ));

    return (
      <Purchases>
        <SubHead>
          <span>{__("purchase")}</span>
          <span>{__("Value")}</span>
          <span>{__("Current Stage")}</span>
          <span>{__("Assigned")}</span>
        </SubHead>
        {contents}
        {this.props.hasMore && (
          <CenterButton>
            <Button
              size="small"
              btnStyle="success"
              icon="refresh"
              onClick={this.props.loadMore}
            >
              Load More
            </Button>
          </CenterButton>
        )}
      </Purchases>
    );
  }
}
